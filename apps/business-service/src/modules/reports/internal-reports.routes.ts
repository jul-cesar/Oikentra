import { Hono } from 'hono'
import { and, desc, eq, gte, lte, inArray, sql } from 'drizzle-orm'

import { getDb } from '../../db/client'
import {
  businesses,
  cashMovements,
  credits,
  creditPayments,
  customers,
} from '../../db/schema'
import { AppError } from '../../http/errors'
import type { AppBindings } from '../../http/request-context'
import { z } from 'zod'

const internalReportsRoutes = new Hono<AppBindings>()

const requestDataSchema = z.object({
  businessId: z.string().min(1),
  reportType: z.string().min(1),
  from: z.string().optional(),
  to: z.string().optional(),
  customerId: z.string().optional(),
})

internalReportsRoutes.post('/data', async (c) => {
  const parsed = requestDataSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 400, 'The request contains invalid data.')
  }

  const { businessId, reportType, from, to, customerId } = parsed.data
  const db = getDb()

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  if (!business) {
    throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
  }

  // Fetch cash movements for the date range
  const movementConditions = [eq(cashMovements.businessId, businessId)]
  if (from) movementConditions.push(gte(cashMovements.businessDate, from))
  if (to) movementConditions.push(lte(cashMovements.businessDate, to))
  if (customerId) {
    // For customer statements, get movements linked to their credits
    const customerCredits = await db
      .select({ id: credits.id })
      .from(credits)
      .where(and(eq(credits.businessId, businessId), eq(credits.customerId, customerId)))
    const creditIds = customerCredits.map((cr) => cr.id)
    if (creditIds.length === 0) {
      movementConditions.push(sql`1 = 0`) // no results
    } else {
      movementConditions.push(
        sql`(${cashMovements.id} IN (
          SELECT cm.id FROM cash_movements cm
          WHERE cm.source_type = 'CREDIT_PAYMENT' AND cm.source_id IN (
            SELECT cp.id FROM credit_payments cp WHERE cp.credit_id IN (${sql.join(creditIds.map((id) => sql`${id}`), sql`,`)})
          )
        ) OR (${cashMovements.sourceType} IS NULL AND ${cashMovements.type} IN ('SALE', 'EXPENSE')))`,
      )
    }
  }

  const movements = await db
    .select()
    .from(cashMovements)
    .where(and(...movementConditions))
    .orderBy(desc(cashMovements.businessDate))

  // Build daily summaries
  const dailyMap = new Map<string, {
    date: string
    salesTotal: number
    expensesTotal: number
    creditPaymentsTotal: number
    creditCreatedTotal: number
    totalIn: number
    totalOut: number
    remaining: number
  }>()

  for (const m of movements) {
    if (m.status !== 'ACTIVE') continue
    const date = m.businessDate
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        salesTotal: 0,
        expensesTotal: 0,
        creditPaymentsTotal: 0,
        creditCreatedTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    const day = dailyMap.get(date)!
    if (m.type === 'SALE') {
      day.salesTotal += m.amount
      day.totalIn += m.amount
    } else if (m.type === 'EXPENSE') {
      day.expensesTotal += m.amount
      day.totalOut += m.amount
    } else if (m.type === 'CREDIT_PAYMENT') {
      day.creditPaymentsTotal += m.amount
      day.totalIn += m.amount
    }
    day.remaining = day.totalIn - day.totalOut
  }

  // Credit created per day
  const creditConditions = [eq(credits.businessId, businessId)]
  if (from) creditConditions.push(gte(credits.creditDate, from))
  if (to) creditConditions.push(lte(credits.creditDate, to))
  if (customerId) creditConditions.push(eq(credits.customerId, customerId))

  const dayCredits = await db
    .select()
    .from(credits)
    .where(and(...creditConditions))

  for (const credit of dayCredits) {
    if (credit.status === 'CANCELLED') continue
    const date = credit.creditDate
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        salesTotal: 0,
        expensesTotal: 0,
        creditPaymentsTotal: 0,
        creditCreatedTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    dailyMap.get(date)!.creditCreatedTotal += credit.originalAmount
  }

  const dailySummaries = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))

  // Receivables
  const pendingCredits = await db
    .select()
    .from(credits)
    .where(and(eq(credits.businessId, businessId), eq(credits.status, 'PENDING')))

  const pendingCreditIds = pendingCredits.map((cr) => cr.id)
  const activePayments = pendingCreditIds.length > 0
    ? await db
        .select({ creditId: creditPayments.creditId, amount: creditPayments.amount })
        .from(creditPayments)
        .where(
          and(
            inArray(creditPayments.creditId, pendingCreditIds),
            eq(creditPayments.status, 'ACTIVE'),
          ),
        )
    : []

  const paidByCredit = new Map<string, number>()
  for (const p of activePayments) {
    paidByCredit.set(p.creditId, (paidByCredit.get(p.creditId) ?? 0) + p.amount)
  }

  const today = new Date()
  const customerMap = new Map<string, { id: string; name: string; totalDebt: number; activeCredits: number; oldDebt: boolean }>()

  let totalReceivable = 0
  let oldDebts = 0

  for (const credit of pendingCredits) {
    const remaining = Math.max(0, credit.originalAmount - (paidByCredit.get(credit.id) ?? 0))
    if (remaining <= 0) continue
    totalReceivable += remaining

    const age = Math.floor((today.getTime() - new Date(`${credit.creditDate}T00:00:00Z`).getTime()) / 86400000)
    const isOld = age > 15
    if (isOld) oldDebts++

    const existing = customerMap.get(credit.customerId)
    if (existing) {
      existing.totalDebt += remaining
      existing.activeCredits += 1
      if (isOld) existing.oldDebt = true
    } else {
      // Fetch customer name
      const [cust] = await db
        .select({ id: customers.id, name: customers.name })
        .from(customers)
        .where(eq(customers.id, credit.customerId))
        .limit(1)

      customerMap.set(credit.customerId, {
        id: credit.customerId,
        name: cust?.name ?? 'Desconocido',
        totalDebt: remaining,
        activeCredits: 1,
        oldDebt: isOld,
      })
    }
  }

  return c.json({
    data: {
      business: {
        id: business.id,
        name: business.name,
        currencyCode: business.currencyCode,
        timezone: business.timezone,
      },
      dailySummaries,
      receivables: {
        totalReceivable,
        customersWithDebt: customerMap.size,
        oldDebts,
      },
      customers: Array.from(customerMap.values()),
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: m.amount,
        category: m.category,
        note: m.note,
        businessDate: m.businessDate,
        status: m.status,
      })),
    },
  })
})

export { internalReportsRoutes }
