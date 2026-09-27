import type { BusinessEvent } from "../../db/schema";
import { AppError } from "../../http/errors";
import { membersService, permissions } from "../businesses/members.service";
import {
	agendaRepository,
	type AgendaRepository,
	type CreditDue,
	type LoanInstallmentDue,
} from "./agenda.repository";

export type AgendaItem = {
	id: string;
	source: "EVENT" | "CREDIT" | "LOAN_INSTALLMENT";
	title: string;
	description: string | null;
	start: string;
	end: string;
	allDay: boolean;
	status: "SCHEDULED" | "OVERDUE" | "COMPLETED" | "CANCELLED";
	readOnly: boolean;
	reminderAt: string | null;
	customerId?: string;
	loanId?: string;
	amount?: number;
};

export type AgendaEventInput = {
	title: string;
	description?: string | null;
	startAt: string;
	endAt: string;
	allDay?: boolean;
	reminderAt?: string | null;
};

export type AgendaEventUpdate = Partial<AgendaEventInput>;

function nextDate(value: string) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

function toEventItem(event: BusinessEvent): AgendaItem {
	return {
		id: event.id,
		source: "EVENT",
		title: event.title,
		description: event.description,
		start: event.startAt.toISOString(),
		end: event.endAt.toISOString(),
		allDay: event.allDay,
		status: event.status,
		readOnly: false,
		reminderAt: event.reminderAt?.toISOString() ?? null,
	};
}

function toCreditItem({
	record,
	paidAmount,
	today,
}: {
	record: CreditDue;
	paidAmount: number;
	today: string;
}): AgendaItem | null {
	const { credit, customerName } = record;
	if (!credit.dueDate) return null;
	return {
		id: credit.id,
		source: "CREDIT",
		title: `Cobro a ${customerName}`,
		description: credit.description,
		start: credit.dueDate,
		end: nextDate(credit.dueDate),
		allDay: true,
		status: credit.dueDate < today ? "OVERDUE" : "SCHEDULED",
		readOnly: true,
		reminderAt: null,
		customerId: credit.customerId,
		amount: Math.max(0, credit.originalAmount - paidAmount),
	};
}

function toLoanInstallmentItem({
	record,
	today,
}: {
	record: LoanInstallmentDue;
	today: string;
}): AgendaItem {
	const { installment, customerId, customerName } = record;
	return {
		id: installment.id,
		source: "LOAN_INSTALLMENT",
		title: `Cuota ${installment.number} · ${customerName}`,
		description: null,
		start: installment.dueDate,
		end: nextDate(installment.dueDate),
		allDay: true,
		status: installment.dueDate < today ? "OVERDUE" : "SCHEDULED",
		readOnly: true,
		reminderAt: null,
		customerId,
		loanId: installment.loanId,
		amount: Math.max(0, installment.totalAmount - installment.paidAmount),
	};
}

type AgendaAuthorize = (input: {
	userId: string;
	businessId: string;
	permission: string;
}) => Promise<unknown>;

export function createAgendaService({
	repository = agendaRepository,
	now = () => new Date(),
	authorize = ({ userId, businessId, permission }) =>
		membersService.requirePermission(userId, businessId, permission),
}: {
	repository?: AgendaRepository;
	now?: () => Date;
	authorize?: AgendaAuthorize;
} = {}) {
	return {
		async list({
			userId,
			businessId,
			range,
		}: {
			userId: string;
			businessId: string;
			range: { start: string; end: string };
		}) {
			await authorize({
				userId,
				businessId,
				permission: permissions.agendaRead,
			});
			const dateRange = {
				start: range.start.slice(0, 10),
				end: range.end.slice(0, 10),
			};
			const [events, credits, installments] = await Promise.all([
				repository.findEventsByBusinessAndRange({
					businessId,
					range: {
						start: new Date(range.start),
						end: new Date(range.end),
					},
				}),
				repository.findCreditsDueByBusinessAndRange({
					businessId,
					range: dateRange,
				}),
				repository.findLoanInstallmentsDueByBusinessAndRange({
					businessId,
					range: dateRange,
				}),
			]);
			const payments = await repository.findActiveCreditPayments(
				credits.map(({ credit }) => credit.id),
			);
			const paidByCredit = new Map<string, number>();
			for (const payment of payments) {
				paidByCredit.set(
					payment.creditId,
					(paidByCredit.get(payment.creditId) ?? 0) + payment.amount,
				);
			}
			const today = now().toISOString().slice(0, 10);
			const creditItems = credits
				.map((record) =>
					toCreditItem({
						record,
						paidAmount: paidByCredit.get(record.credit.id) ?? 0,
						today,
					}),
				)
				.filter((item): item is AgendaItem => item !== null);
			const items: AgendaItem[] = [
				...events.map(toEventItem),
				...creditItems,
				...installments.map((record) =>
					toLoanInstallmentItem({ record, today }),
				),
			];
			return items.sort((...pair) =>
				pair[0].start.localeCompare(pair[1].start),
			);
		},

		async create({
			userId,
			recipientEmail,
			businessId,
			input,
		}: {
			userId: string;
			recipientEmail?: string;
			businessId: string;
			input: AgendaEventInput;
		}) {
			await authorize({
				userId,
				businessId,
				permission: permissions.agendaCreate,
			});
			const timestamp = now();
			const reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
			if (reminderAt && !recipientEmail) {
				throw new AppError(
					"REMINDER_EMAIL_UNAVAILABLE",
					422,
					"The authenticated user does not have an email address.",
				);
			}
			return toEventItem(
				await repository.createEvent(
					{
						id: crypto.randomUUID(),
						userId,
						businessId,
						title: input.title,
						description: input.description ?? null,
						startAt: new Date(input.startAt),
						endAt: new Date(input.endAt),
						allDay: input.allDay ?? false,
						reminderAt,
						status: "SCHEDULED",
						version: 1,
						createdAt: timestamp,
						updatedAt: timestamp,
					},
					reminderAt && recipientEmail
						? { recipientEmail, scheduledAt: reminderAt }
						: undefined,
				),
			);
		},

		async update({
			userId,
			recipientEmail,
			businessId,
			eventId,
			input,
		}: {
			userId: string;
			recipientEmail?: string;
			businessId: string;
			eventId: string;
			input: AgendaEventUpdate;
		}) {
			await authorize({
				userId,
				businessId,
				permission: permissions.agendaCreate,
			});
			const patch: Parameters<AgendaRepository["updateEvent"]>[0]["patch"] = {
				updatedAt: now(),
			};
			if (input.title !== undefined) patch.title = input.title;
			if (input.description !== undefined)
				patch.description = input.description;
			if (input.allDay !== undefined) patch.allDay = input.allDay;
			if (input.startAt) patch.startAt = new Date(input.startAt);
			if (input.endAt) patch.endAt = new Date(input.endAt);
			let reminder: Parameters<AgendaRepository["updateEvent"]>[0]["reminder"];
			if (input.reminderAt !== undefined) {
				patch.reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
				if (patch.reminderAt && !recipientEmail) {
					throw new AppError(
						"REMINDER_EMAIL_UNAVAILABLE",
						422,
						"The authenticated user does not have an email address.",
					);
				}
				reminder = patch.reminderAt && recipientEmail
					? { recipientEmail, scheduledAt: patch.reminderAt }
					: null;
			}
			const event = await repository.updateEvent({
				eventId,
				businessId,
				patch,
				reminder,
			});
			if (!event) {
				throw new AppError("EVENT_NOT_FOUND", 404, "The event was not found.");
			}
			return toEventItem(event);
		},

		async cancel({
			userId,
			businessId,
			eventId,
		}: {
			userId: string;
			businessId: string;
			eventId: string;
		}) {
			await authorize({
				userId,
				businessId,
				permission: permissions.agendaCreate,
			});
			const event = await repository.cancelEvent({
				eventId,
				businessId,
				updatedAt: now(),
			});
			if (!event) {
				throw new AppError("EVENT_NOT_FOUND", 404, "The event was not found.");
			}
			return toEventItem(event);
		},
	};
}

export const agendaService = createAgendaService();
