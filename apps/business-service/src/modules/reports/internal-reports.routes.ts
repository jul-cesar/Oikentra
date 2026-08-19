import { Hono } from 'hono'
import { and, desc, eq, gte, lte, inArray, ne, sql } from 'drizzle-orm'

import { getDb } from '../../db/client'
import {
  businesses,
  cashMovements,
  creditMovements,
  credits,
  creditPayments,
  customers,
  loans,
  loanPayments,
  portfolioMovements,
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

  // Fetch cash movements for the date range (operating cash: sales and expenses)
  const movementConditions = [
    eq(cashMovements.businessId, businessId),
    ne(cashMovements.type, 'CREDIT_PAYMENT'),
    ne(cashMovements.type, 'LOAN_PAYMENT'),
    ne(cashMovements.type, 'LOAN_DISBURSEMENT'),
  ]
  if (from) movementConditions.push(gte(cashMovements.businessDate, from))
  if (to) movementConditions.push(lte(cashMovements.businessDate, to))
  if (customerId) {
    // For customer statements, only operating cash movements
    movementConditions.push(
      sql`(${cashMovements.sourceType} IS NULL AND ${cashMovements.type} IN ('SALE', 'EXPENSE'))`,
    )
  }

  const movements = await db
    .select()
    .from(cashMovements)
    .where(and(...movementConditions))
    .orderBy(desc(cashMovements.businessDate))

  // Fetch credit movements (fiado abonos and fiados granted) for the date range
  const creditMovementConditions = [eq(creditMovements.businessId, businessId)]
  if (from) creditMovementConditions.push(gte(creditMovements.businessDate, from))
  if (to) creditMovementConditions.push(lte(creditMovements.businessDate, to))
  if (customerId) {
    const customerCredits = await db
      .select({ id: credits.id })
      .from(credits)
      .where(and(eq(credits.businessId, businessId), eq(credits.customerId, customerId)))
    const creditIds = customerCredits.map((cr) => cr.id)
    const creditIn = creditIds.length ? sql`IN (${sql.join(creditIds.map((id) => sql`${id}`), sql`,`)})` : sql`IN (NULL)`
    creditMovementConditions.push(
      sql`(${creditMovements.id} IN (
        SELECT cm.id FROM credit_movements cm
        WHERE cm.source_type = 'CREDIT_PAYMENT' AND cm.source_id IN (
          SELECT cp.id FROM credit_payments cp WHERE cp.credit_id ${creditIn}
        )
        UNION
        SELECT cm.id FROM credit_movements cm
        WHERE cm.source_type = 'CREDIT_DISBURSEMENT' AND cm.source_id ${creditIn}
      ))`,
    )
  }

  const creditMovementRows = await db
    .select()
    .from(creditMovements)
    .where(and(...creditMovementConditions))
    .orderBy(desc(creditMovements.businessDate))

  // Fetch portfolio movements (loan payments and disbursements)
  const portfolioConditions = [eq(portfolioMovements.businessId, businessId)]
  if (from) portfolioConditions.push(gte(portfolioMovements.businessDate, from))
  if (to) portfolioConditions.push(lte(portfolioMovements.businessDate, to))
  if (customerId) {
    const customerLoans = await db
      .select({ id: loans.id })
      .from(loans)
      .where(and(eq(loans.businessId, businessId), eq(loans.customerId, customerId)))
    const loanIds = customerLoans.map((l) => l.id)
    const loanIn = loanIds.length ? sql`IN (${sql.join(loanIds.map((id) => sql`${id}`), sql`,`)})` : sql`IN (NULL)`
    portfolioConditions.push(
      sql`(${portfolioMovements.id} IN (
        SELECT pm.id FROM portfolio_movements pm
        WHERE pm.source_type = 'LOAN_PAYMENT' AND pm.source_id IN (
          SELECT lp.id FROM loan_payments lp WHERE lp.loan_id ${loanIn}
        )
        UNION
        SELECT pm.id FROM portfolio_movements pm
        WHERE pm.source_type = 'LOAN_DISBURSEMENT' AND pm.source_id ${loanIn}
      ))`,
    )
  }

  const portfolioMovementRows = await db
    .select()
    .from(portfolioMovements)
    .where(and(...portfolioConditions))
    .orderBy(desc(portfolioMovements.businessDate))

  // Build daily summaries
  const dailyMap = new Map<string, {
    date: string
    salesTotal: number
    expensesTotal: number
    creditPaymentsTotal: number
    creditCreatedTotal: number
    loanPaymentsTotal: number
    loanDisbursementsTotal: number
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
        loanPaymentsTotal: 0,
        loanDisbursementsTotal: 0,
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
    }
    day.remaining = day.totalIn - day.totalOut
  }

  for (const cm of creditMovementRows) {
    if (cm.status !== 'ACTIVE') continue
    const date = cm.businessDate
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        salesTotal: 0,
        expensesTotal: 0,
        creditPaymentsTotal: 0,
        creditCreatedTotal: 0,
        loanPaymentsTotal: 0,
        loanDisbursementsTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    const day = dailyMap.get(date)!
    if (cm.type === 'CREDIT_PAYMENT') {
      day.creditPaymentsTotal += cm.amount
      day.totalIn += cm.amount
    }
    day.remaining = day.totalIn - day.totalOut
  }

  for (const pm of portfolioMovementRows) {
    if (pm.status !== 'ACTIVE') continue
    const date = pm.businessDate
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        salesTotal: 0,
        expensesTotal: 0,
        creditPaymentsTotal: 0,
        creditCreatedTotal: 0,
        loanPaymentsTotal: 0,
        loanDisbursementsTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    const day = dailyMap.get(date)!
    if (pm.type === 'LOAN_PAYMENT') {
      day.loanPaymentsTotal += pm.amount
      day.totalIn += pm.amount
    } else if (pm.type === 'LOAN_DISBURSEMENT') {
      day.loanDisbursementsTotal += pm.amount
      day.totalOut += pm.amount
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
        loanPaymentsTotal: 0,
        loanDisbursementsTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    dailyMap.get(date)!.creditCreatedTotal += credit.originalAmount
  }

  // Loan disbursed per day
  const loanConditions = [eq(loans.businessId, businessId)]
  if (from) loanConditions.push(gte(loans.loanDate, from))
  if (to) loanConditions.push(lte(loans.loanDate, to))
  if (customerId) loanConditions.push(eq(loans.customerId, customerId))

  const dayLoans = await db
    .select()
    .from(loans)
    .where(and(...loanConditions))

  for (const loan of dayLoans) {
    if (loan.status === 'CANCELLED') continue
    const date = loan.loanDate
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        salesTotal: 0,
        expensesTotal: 0,
        creditPaymentsTotal: 0,
        creditCreatedTotal: 0,
        loanPaymentsTotal: 0,
        loanDisbursementsTotal: 0,
        totalIn: 0,
        totalOut: 0,
        remaining: 0,
      })
    }
    dailyMap.get(date)!.loanDisbursementsTotal += loan.capitalAmount
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

  // Loans outstanding
  const pendingLoans = await db
    .select()
    .from(loans)
    .where(and(eq(loans.businessId, businessId), eq(loans.status, 'ACTIVE')))

  const pendingLoanIds = pendingLoans.map((l) => l.id)
  const activeLoanPayments = pendingLoanIds.length > 0
    ? await db
        .select({ loanId: loanPayments.loanId, amount: loanPayments.amount })
        .from(loanPayments)
        .where(
          and(
            inArray(loanPayments.loanId, pendingLoanIds),
            eq(loanPayments.status, 'ACTIVE'),
          ),
        )
    : []

  const paidByLoan = new Map<string, number>()
  for (const p of activeLoanPayments) {
    paidByLoan.set(p.loanId, (paidByLoan.get(p.loanId) ?? 0) + p.amount)
  }

  let totalLoanOutstanding = 0
  let overdueLoans = 0
  for (const loan of pendingLoans) {
    const remaining = Math.max(0, loan.totalAmount - (paidByLoan.get(loan.id) ?? 0))
    if (remaining <= 0) continue
    totalLoanOutstanding += remaining
    const due = new Date(`${loan.dueDate}T00:00:00Z`)
    if (due.getTime() < today.getTime()) overdueLoans++
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
      loansReceivables: {
        totalOutstanding: totalLoanOutstanding,
        loansWithDebt: pendingLoans.length,
        overdueLoans,
      },
      movements: [
        ...movements.map((m) => ({
          id: m.id,
          type: m.type,
          amount: m.amount,
          category: m.category,
          note: m.note,
          businessDate: m.businessDate,
          status: m.status,
        })),
        ...creditMovementRows.map((cm) => ({
          id: cm.id,
          type: cm.type,
          amount: cm.amount,
          category: null,
          note: cm.note,
          businessDate: cm.businessDate,
          status: cm.status,
        })),
        ...portfolioMovementRows.map((pm) => ({
          id: pm.id,
          type: pm.type,
          amount: pm.amount,
          category: null,
          note: pm.note,
          businessDate: pm.businessDate,
          status: pm.status,
        })),
      ],
    },
  })
})

export { internalReportsRoutes }
