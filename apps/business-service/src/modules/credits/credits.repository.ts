import { and, desc, eq, gte, inArray, lte, sql, sum } from 'drizzle-orm'

import { getDb } from '../../db/client'
import {
  creditPayments,
  credits,
  cashMovements,
  type Credit,
  type CreditPayment,
  type NewCredit,
  type NewCreditPayment,
  type CashMovement,
  type NewCashMovement,
  type CreditStatus,
} from '../../db/schema'

export type CreditRepository = {
  createCredit(input: NewCredit): Promise<Credit>
  createPayment(
    paymentInput: NewCreditPaymentInput,
    cashMovementInput: NewCashMovement,
  ): Promise<{ payment: CreditPayment; cashMovement: CashMovement }>
  findCreditById(creditId: string): Promise<Credit | null>
  findCreditsByBusiness(
    businessId: string,
    filters?: { customerId?: string; status?: CreditStatus; from?: string; to?: string; limit?: number; cursor?: string },
  ): Promise<Credit[]>
  findPaymentsByCreditId(creditId: string): Promise<CreditPayment[]>
  findPaymentByIdAndCredit(paymentId: string, creditId: string): Promise<CreditPayment | null>
  getCreditTotalPaid(creditId: string): Promise<number>
  cancelCredit(
    creditId: string,
    reason: string,
  ): Promise<Credit | null>
  updateCreditStatus(
    creditId: string,
    status: CreditStatus,
    timestamp: Date,
  ): Promise<void>
  cancelPayment(
    paymentId: string,
    creditId: string,
    reason: string,
  ): Promise<{ payment: CreditPayment | null; cashMovement: CashMovement | null }>
  getActiveCreditsByCustomer(customerId: string, businessId: string): Promise<Credit[]>
  getDebtSummariesByBusiness(businessId: string): Promise<Map<string, { totalDebt: number; activeCredits: number; oldDebt: boolean }>>
  getBusinessDebtSummary(businessId: string): Promise<{ totalDebt: number; customersWithDebt: number; oldDebts: number }>
}

type NewCreditPaymentInput = Omit<NewCreditPayment, 'createdAt' | 'updatedAt' | 'cashMovementId'>;

export const creditRepository: CreditRepository = {
  async createCredit(input) {
    const db = getDb()
    const [credit] = await db.insert(credits).values(input).returning()
    return credit
  },

  async createPayment(paymentInput, cashMovementInput) {
    const db = getDb()
    const now = new Date()

    return db.transaction(async (tx) => {
      const [cashMovement] = await tx.insert(cashMovements).values(cashMovementInput).returning()

      const [payment] = await tx
        .insert(creditPayments)
        .values({
          ...paymentInput,
          cashMovementId: cashMovement.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning()

      return { payment, cashMovement }
    })
  },

  async findCreditById(creditId) {
    const db = getDb()
    const [credit] = await db
      .select()
      .from(credits)
      .where(eq(credits.id, creditId))
      .limit(1)
    return credit ?? null
  },

  async findCreditsByBusiness(businessId, filters) {
    const db = getDb()
    const conditions = [eq(credits.businessId, businessId)]

    if (filters?.customerId) {
      conditions.push(eq(credits.customerId, filters.customerId))
    }
    if (filters?.status) {
      conditions.push(eq(credits.status, filters.status))
    }
    if (filters?.from) {
      conditions.push(gte(credits.creditDate, filters.from))
    }
    if (filters?.to) {
      conditions.push(lte(credits.creditDate, filters.to))
    }

    return db
      .select()
      .from(credits)
      .where(and(...conditions))
      .orderBy(desc(credits.createdAt))
      .limit(filters?.limit ?? 50)
  },

  async findPaymentsByCreditId(creditId) {
    const db = getDb()
    return db
      .select()
      .from(creditPayments)
      .where(
        and(eq(creditPayments.creditId, creditId), eq(creditPayments.status, 'ACTIVE')),
      )
      .orderBy(desc(creditPayments.paymentDate))
  },

  async findPaymentByIdAndCredit(paymentId, creditId) {
    const db = getDb()
    const [payment] = await db
      .select()
      .from(creditPayments)
      .where(and(eq(creditPayments.id, paymentId), eq(creditPayments.creditId, creditId)))
      .limit(1)
    return payment ?? null
  },

  async getCreditTotalPaid(creditId) {
    const db = getDb()
    const [result] = await db
      .select({ total: sum(creditPayments.amount) })
      .from(creditPayments)
      .where(
        and(eq(creditPayments.creditId, creditId), eq(creditPayments.status, 'ACTIVE')),
      )
    return result?.total ? Number(result.total) : 0
  },

  async updateCreditStatus(creditId, status, timestamp) {
    const db = getDb()
    const update: Record<string, any> = {
      status,
      updatedAt: timestamp,
      version: sql`${credits.version} + 1`,
    }
    if (status === 'PAID') {
      update.paidAt = timestamp
    } else if (status === 'CANCELLED') {
      update.cancelledAt = timestamp
    }
    await db
      .update(credits)
      .set(update)
      .where(eq(credits.id, creditId))
  },

  async cancelCredit(creditId, reason) {
    const db = getDb()
    const now = new Date()
    const [credit] = await db
      .update(credits)
      .set({
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: now,
        updatedAt: now,
        version: sql`${credits.version} + 1`,
      })
      .where(and(eq(credits.id, creditId), eq(credits.status, 'PENDING')))
      .returning()
    return credit ?? null
  },

  async cancelPayment(paymentId, creditId, reason) {
    const db = getDb()
    const now = new Date()

    return db.transaction(async (tx) => {
      const [payment] = await tx
        .update(creditPayments)
        .set({
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: now,
          updatedAt: now,
          version: sql`${creditPayments.version} + 1`,
        })
        .where(
          and(
            eq(creditPayments.id, paymentId),
            eq(creditPayments.creditId, creditId),
            eq(creditPayments.status, 'ACTIVE'),
          ),
        )
        .returning()

      if (!payment) return { payment: null, cashMovement: null }

      const [cashMovement] = await tx
        .update(cashMovements)
        .set({
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: now,
          updatedAt: now,
          version: sql`${cashMovements.version} + 1`,
        })
        .where(
          and(
            eq(cashMovements.id, payment.cashMovementId),
            eq(cashMovements.status, 'ACTIVE'),
          ),
        )
        .returning()

      return { payment, cashMovement }
    })
  },

  async getActiveCreditsByCustomer(customerId, businessId) {
    const db = getDb()
    return db
      .select()
      .from(credits)
      .where(
        and(
          eq(credits.customerId, customerId),
          eq(credits.businessId, businessId),
          eq(credits.status, 'PENDING'),
        ),
      )
  },

  async getDebtSummariesByBusiness(businessId) {
    const db = getDb()
    const pending = await db.select().from(credits).where(and(eq(credits.businessId, businessId), eq(credits.status, 'PENDING')))
    const result = new Map<string, { totalDebt: number; activeCredits: number; oldDebt: boolean }>()
    if (!pending.length) return result

    const payments = await db
      .select({ creditId: creditPayments.creditId, amount: creditPayments.amount })
      .from(creditPayments)
      .where(and(inArray(creditPayments.creditId, pending.map((credit) => credit.id)), eq(creditPayments.status, 'ACTIVE')))
    const paid = new Map<string, number>()
    for (const payment of payments) paid.set(payment.creditId, (paid.get(payment.creditId) ?? 0) + payment.amount)
    for (const credit of pending) {
      const remaining = Math.max(0, credit.originalAmount - (paid.get(credit.id) ?? 0))
      const current = result.get(credit.customerId) ?? { totalDebt: 0, activeCredits: 0, oldDebt: false }
      current.totalDebt += remaining
      if (remaining > 0) current.activeCredits += 1
      const age = Math.floor((Date.now() - new Date(`${credit.creditDate}T00:00:00Z`).getTime()) / 86400000)
      if (remaining > 0 && age > 15) current.oldDebt = true
      result.set(credit.customerId, current)
    }
    return result
  },

  async getBusinessDebtSummary(businessId) {
    const db = getDb()
    const pending = await db.select().from(credits).where(and(eq(credits.businessId, businessId), eq(credits.status, 'PENDING')))
    if (!pending.length) return { totalDebt: 0, customersWithDebt: 0, oldDebts: 0 }
    const payments = await db
      .select({ creditId: creditPayments.creditId, amount: creditPayments.amount })
      .from(creditPayments)
      .where(and(inArray(creditPayments.creditId, pending.map((credit) => credit.id)), eq(creditPayments.status, 'ACTIVE')))
    const paid = new Map<string, number>()
    for (const payment of payments) paid.set(payment.creditId, (paid.get(payment.creditId) ?? 0) + payment.amount)
    const customers = new Set<string>()
    let totalDebt = 0
    let oldDebts = 0
    const today = new Date()
    for (const credit of pending) {
      const remaining = Math.max(0, credit.originalAmount - (paid.get(credit.id) ?? 0))
      if (!remaining) continue
      totalDebt += remaining
      customers.add(credit.customerId)
      const age = Math.floor((today.getTime() - new Date(`${credit.creditDate}T00:00:00Z`).getTime()) / 86400000)
      if (age > 15) oldDebts += 1
    }
    return { totalDebt, customersWithDebt: customers.size, oldDebts }
  },
}
