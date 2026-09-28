import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "../../db/client";
import {
  businessEvents,
  businesses,
  creditPayments,
  credits,
  customers,
  loanInstallments,
  loans,
  scheduledEventReminders,
  type BusinessEvent,
  type Credit,
  type NewBusinessEvent,
} from "../../db/schema";
import type { DueReminder, ReminderWorkerRepository } from "./reminder.worker";

type EventPatch = Partial<
  Pick<
    BusinessEvent,
    "title" | "description" | "startAt" | "endAt" | "allDay" | "reminderAt"
  >
> & { updatedAt: Date };

export type ReminderSchedule = {
  recipientEmail: string;
  scheduledAt: Date;
};

export type CreditDue = { credit: Credit; customerName: string };
export type LoanInstallmentDue = {
  installment: typeof loanInstallments.$inferSelect;
  customerId: string;
  customerName: string;
};

export type AgendaRepository = ReminderWorkerRepository & {
  createEvent(
    input: NewBusinessEvent,
    reminder?: ReminderSchedule,
  ): Promise<BusinessEvent>;
  findEventsByBusinessAndRange(input: {
    businessId: string;
    range: { start: Date; end: Date };
  }): Promise<BusinessEvent[]>;
  findCreditsDueByBusinessAndRange(input: {
    businessId: string;
    range: { start: string; end: string };
  }): Promise<CreditDue[]>;
  findActiveCreditPayments(
    creditIds: string[],
  ): Promise<{ creditId: string; amount: number }[]>;
  findLoanInstallmentsDueByBusinessAndRange(input: {
    businessId: string;
    range: { start: string; end: string };
  }): Promise<LoanInstallmentDue[]>;
  updateEvent(input: {
    eventId: string;
    businessId: string;
    patch: EventPatch;
    reminder?: ReminderSchedule | null;
  }): Promise<BusinessEvent | null>;
  cancelEvent(input: {
    eventId: string;
    businessId: string;
    updatedAt: Date;
  }): Promise<BusinessEvent | null>;
};

export const agendaRepository: AgendaRepository = {
  async createEvent(input, reminder) {
    return getDb().transaction(async (tx) => {
      const [event] = await tx.insert(businessEvents).values(input).returning();
      if (reminder) {
        await tx.insert(scheduledEventReminders).values({
          id: crypto.randomUUID(),
          eventId: input.id,
          recipientEmail: reminder.recipientEmail,
          scheduledAt: reminder.scheduledAt,
          nextAttemptAt: reminder.scheduledAt,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        });
      }
      return event!;
    });
  },

  async findEventsByBusinessAndRange({ businessId, range }) {
    return getDb()
      .select()
      .from(businessEvents)
      .where(
        and(
          eq(businessEvents.businessId, businessId),
          ne(businessEvents.status, "CANCELLED"),
          lt(businessEvents.startAt, range.end),
          gt(businessEvents.endAt, range.start),
        ),
      );
  },

  async findCreditsDueByBusinessAndRange({ businessId, range }) {
    return getDb()
      .select({ credit: credits, customerName: customers.name })
      .from(credits)
      .innerJoin(customers, eq(customers.id, credits.customerId))
      .where(
        and(
          eq(credits.businessId, businessId),
          eq(credits.status, "PENDING"),
          gte(credits.dueDate, range.start),
          lt(credits.dueDate, range.end),
        ),
      );
  },

  async findActiveCreditPayments(creditIds) {
    if (!creditIds.length) return [];
    return getDb()
      .select({
        creditId: creditPayments.creditId,
        amount: creditPayments.amount,
      })
      .from(creditPayments)
      .where(
        and(
          inArray(creditPayments.creditId, creditIds),
          eq(creditPayments.status, "ACTIVE"),
        ),
      );
  },

  async findLoanInstallmentsDueByBusinessAndRange({ businessId, range }) {
    return getDb()
      .select({
        installment: loanInstallments,
        customerId: loans.customerId,
        customerName: customers.name,
      })
      .from(loanInstallments)
      .innerJoin(loans, eq(loans.id, loanInstallments.loanId))
      .innerJoin(customers, eq(customers.id, loans.customerId))
      .where(
        and(
          eq(loans.businessId, businessId),
          eq(loans.status, "ACTIVE"),
          inArray(loanInstallments.status, ["PENDING", "PARTIAL", "OVERDUE"]),
          gte(loanInstallments.dueDate, range.start),
          lt(loanInstallments.dueDate, range.end),
        ),
      );
  },

  async updateEvent({ eventId, businessId, patch, reminder }) {
    return getDb().transaction(async (tx) => {
      const [event] = await tx
        .update(businessEvents)
        .set({ ...patch, version: sql`${businessEvents.version} + 1` })
        .where(
          and(
            eq(businessEvents.id, eventId),
            eq(businessEvents.businessId, businessId),
            ne(businessEvents.status, "CANCELLED"),
          ),
        )
        .returning();
      if (!event || reminder === undefined) return event ?? null;

      if (reminder === null) {
        await tx
          .update(scheduledEventReminders)
          .set({
            status: "CANCELLED",
            lockedUntil: null,
            updatedAt: patch.updatedAt,
          })
          .where(eq(scheduledEventReminders.eventId, eventId));
      } else {
        await tx
          .insert(scheduledEventReminders)
          .values({
            id: crypto.randomUUID(),
            eventId,
            recipientEmail: reminder.recipientEmail,
            scheduledAt: reminder.scheduledAt,
            nextAttemptAt: reminder.scheduledAt,
            createdAt: patch.updatedAt,
            updatedAt: patch.updatedAt,
          })
          .onConflictDoUpdate({
            target: scheduledEventReminders.eventId,
            set: {
              recipientEmail: reminder.recipientEmail,
              scheduledAt: reminder.scheduledAt,
              nextAttemptAt: reminder.scheduledAt,
              status: "PENDING",
              attempts: 0,
              lockedUntil: null,
              sentAt: null,
              lastError: null,
              updatedAt: patch.updatedAt,
            },
          });
      }
      return event;
    });
  },

  async cancelEvent({ eventId, businessId, updatedAt }) {
    return getDb().transaction(async (tx) => {
      const [event] = await tx
        .update(businessEvents)
        .set({
          status: "CANCELLED",
          updatedAt,
          version: sql`${businessEvents.version} + 1`,
        })
        .where(
          and(
            eq(businessEvents.id, eventId),
            eq(businessEvents.businessId, businessId),
            ne(businessEvents.status, "CANCELLED"),
          ),
        )
        .returning();
      if (event) {
        await tx
          .update(scheduledEventReminders)
          .set({ status: "CANCELLED", lockedUntil: null, updatedAt })
          .where(eq(scheduledEventReminders.eventId, eventId));
      }
      return event ?? null;
    });
  },

  async claimDueReminders({ now, lockedUntil, limit }) {
    return getDb().transaction(async (tx) => {
      const due = await tx
        .select({ id: scheduledEventReminders.id })
        .from(scheduledEventReminders)
        .where(
          and(
            lte(scheduledEventReminders.scheduledAt, now),
            lte(scheduledEventReminders.nextAttemptAt, now),
            or(
              eq(scheduledEventReminders.status, "PENDING"),
              and(
                eq(scheduledEventReminders.status, "PROCESSING"),
                lte(scheduledEventReminders.lockedUntil, now),
              ),
            ),
          ),
        )
        .orderBy(asc(scheduledEventReminders.scheduledAt))
        .limit(limit)
        .for("update", { skipLocked: true });
      if (!due.length) return [];

      const ids = due.map(({ id }) => id);
      await tx
        .update(scheduledEventReminders)
        .set({
          status: "PROCESSING",
          attempts: sql`${scheduledEventReminders.attempts} + 1`,
          lockedUntil,
          updatedAt: now,
        })
        .where(inArray(scheduledEventReminders.id, ids));

      return tx
        .select({
          id: scheduledEventReminders.id,
          eventId: scheduledEventReminders.eventId,
          recipientEmail: scheduledEventReminders.recipientEmail,
          title: businessEvents.title,
          description: businessEvents.description,
          startAt: businessEvents.startAt,
          scheduledAt: scheduledEventReminders.scheduledAt,
          timeZone: businesses.timezone,
          attempts: scheduledEventReminders.attempts,
        })
        .from(scheduledEventReminders)
        .innerJoin(
          businessEvents,
          eq(businessEvents.id, scheduledEventReminders.eventId),
        )
        .innerJoin(businesses, eq(businesses.id, businessEvents.businessId))
        .where(inArray(scheduledEventReminders.id, ids)) as Promise<
        DueReminder[]
      >;
    });
  },

  async markReminderSent({ id, sentAt }) {
    await getDb()
      .update(scheduledEventReminders)
      .set({
        status: "SENT",
        sentAt,
        lockedUntil: null,
        lastError: null,
        updatedAt: sentAt,
      })
      .where(eq(scheduledEventReminders.id, id));
  },

  async markReminderFailed({ id, error, failed, nextAttemptAt, updatedAt }) {
    await getDb()
      .update(scheduledEventReminders)
      .set({
        status: failed ? "FAILED" : "PENDING",
        nextAttemptAt,
        lockedUntil: null,
        lastError: error.slice(0, 2_000),
        updatedAt,
      })
      .where(eq(scheduledEventReminders.id, id));
  },
};
