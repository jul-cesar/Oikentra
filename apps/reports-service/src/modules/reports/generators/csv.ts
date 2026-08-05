import type { ReportDataResponse } from '../data-client'

type CurrencyFormatter = (amount: number) => string

function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function buildHeader(title: string, businessName: string, dateRange?: string): string {
  const lines: string[] = []
  lines.push(`REPORTE: ${title}`)
  lines.push(`Negocio: ${businessName}`)
  if (dateRange) lines.push(`Periodo: ${dateRange}`)
  lines.push(`Generado: ${new Date().toLocaleDateString('es-CO')}`)
  lines.push('')
  return lines.join('\n')
}

// ─── Daily Summary ──────────────────────────────────────────

export function generateDailySummaryCSV(data: ReportDataResponse, date: string): string {
  const fmt: CurrencyFormatter = formatCOP
  const summary = data.dailySummaries.find((s) => s.date === date) ?? {
    date,
    salesTotal: 0,
    expensesTotal: 0,
    creditPaymentsTotal: 0,
    creditCreatedTotal: 0,
    totalIn: 0,
    totalOut: 0,
    remaining: 0,
  }

  const lines: string[] = []
  lines.push(buildHeader('RESUMEN DEL DÍA', data.business.name, formatDate(date)))
  lines.push('Concepto,Monto')
  lines.push(`Entró,${fmt(summary.totalIn)}`)
  lines.push(`Salió,${fmt(summary.totalOut)}`)
  lines.push(`Quedó,${fmt(summary.remaining)}`)
  lines.push('')
  lines.push('Detalle')
  lines.push('Concepto,Monto')
  lines.push(`Ventas de contado,${fmt(summary.salesTotal)}`)
  lines.push(`Abonos recibidos,${fmt(summary.creditPaymentsTotal)}`)
  lines.push(`Gastos,${fmt(summary.expensesTotal)}`)
  lines.push(`Fiados nuevos,${fmt(summary.creditCreatedTotal)}`)

  return lines.join('\n')
}

// ─── Weekly Summary ─────────────────────────────────────────

export function generateWeeklySummaryCSV(data: ReportDataResponse, from: string, to: string): string {
  const fmt: CurrencyFormatter = formatCOP
  const lines: string[] = []
  lines.push(buildHeader('RESUMEN SEMANAL', data.business.name, `${formatDate(from)} - ${formatDate(to)}`))
  lines.push('Fecha,Entró,Salió,Quedó,Ventas,Abonos,Gastos,Fiados')
  for (const day of data.dailySummaries) {
    lines.push(
      `${day.date},${fmt(day.totalIn)},${fmt(day.totalOut)},${fmt(day.remaining)},${fmt(day.salesTotal)},${fmt(day.creditPaymentsTotal)},${fmt(day.expensesTotal)},${fmt(day.creditCreatedTotal)}`,
    )
  }

  const totals = data.dailySummaries.reduce(
    (acc, d) => ({
      totalIn: acc.totalIn + d.totalIn,
      totalOut: acc.totalOut + d.totalOut,
      salesTotal: acc.salesTotal + d.salesTotal,
      creditPaymentsTotal: acc.creditPaymentsTotal + d.creditPaymentsTotal,
      expensesTotal: acc.expensesTotal + d.expensesTotal,
      creditCreatedTotal: acc.creditCreatedTotal + d.creditCreatedTotal,
    }),
    { totalIn: 0, totalOut: 0, salesTotal: 0, creditPaymentsTotal: 0, expensesTotal: 0, creditCreatedTotal: 0 },
  )

  lines.push('')
  lines.push(`TOTAL,${fmt(totals.totalIn)},${fmt(totals.totalOut)},${fmt(totals.totalIn - totals.totalOut)},${fmt(totals.salesTotal)},${fmt(totals.creditPaymentsTotal)},${fmt(totals.expensesTotal)},${fmt(totals.creditCreatedTotal)}`)

  return lines.join('\n')
}

// ─── Receivables ────────────────────────────────────────────

export function generateReceivablesCSV(data: ReportDataResponse): string {
  const fmt: CurrencyFormatter = formatCOP
  const lines: string[] = []
  lines.push(buildHeader('CUENTAS POR COBRAR', data.business.name))
  lines.push(`Total por cobrar,${fmt(data.receivables.totalReceivable)}`)
  lines.push(`Clientes con deuda,${data.receivables.customersWithDebt}`)
  lines.push(`Deudas antiguas,${data.receivables.oldDebts}`)
  lines.push('')
  lines.push('Cliente,Deuda pendiente,Fiados activos,Deuda antigua')
  for (const c of data.customers) {
    lines.push(`${c.name},${fmt(c.totalDebt)},${c.activeCredits},${c.oldDebt ? 'Sí' : 'No'}`)
  }

  return lines.join('\n')
}

// ─── Aged Debts ─────────────────────────────────────────────

export function generateAgedDebtsCSV(data: ReportDataResponse): string {
  const fmt: CurrencyFormatter = formatCOP
  const lines: string[] = []
  lines.push(buildHeader('DEUDAS ANTIGUAS', data.business.name))
  lines.push('Cliente,Deuda pendiente,Estado')
  for (const c of data.customers.filter((c) => c.oldDebt)) {
    lines.push(`${c.name},${fmt(c.totalDebt)},Antigua`)
  }
  for (const c of data.customers.filter((c) => !c.oldDebt && c.totalDebt > 0)) {
    lines.push(`${c.name},${fmt(c.totalDebt)},Reciente`)
  }

  return lines.join('\n')
}

// ─── Movement History ───────────────────────────────────────

export function generateMovementHistoryCSV(data: ReportDataResponse, from: string, to: string): string {
  const fmt: CurrencyFormatter = formatCOP
  const lines: string[] = []
  lines.push(buildHeader('HISTORIAL DE MOVIMIENTOS', data.business.name, `${formatDate(from)} - ${formatDate(to)}`))
  lines.push('Fecha,Tipo,Monto,Categoría,Nota,Estado')
  for (const m of data.movements) {
    const typeLabel = m.type === 'SALE' ? 'Venta' : m.type === 'EXPENSE' ? 'Gasto' : 'Abono'
    const statusLabel = m.status === 'ACTIVE' ? 'Activo' : 'Anulado'
    lines.push(`${m.businessDate},${typeLabel},${fmt(m.amount)},${m.category ?? ''},${m.note ?? ''},${statusLabel}`)
  }

  return lines.join('\n')
}

// ─── Customer Statement ─────────────────────────────────────

export function generateCustomerStatementCSV(data: ReportDataResponse, customerId: string): string {
  const fmt: CurrencyFormatter = formatCOP
  const customer = data.customers.find((c) => c.id === customerId)
  const customerName = customer?.name ?? 'Desconocido'

  const lines: string[] = []
  lines.push(buildHeader(`ESTADO DE CUENTA: ${customerName}`, data.business.name))
  lines.push(`Total pendiente,${fmt(customer?.totalDebt ?? 0)}`)
  lines.push(`Fiados activos,${customer?.activeCredits ?? 0}`)
  lines.push('')
  lines.push('Fecha,Tipo,Monto,Estado')
  for (const m of data.movements) {
    const typeLabel = m.type === 'SALE' ? 'Venta' : m.type === 'EXPENSE' ? 'Gasto' : 'Abono'
    const statusLabel = m.status === 'ACTIVE' ? 'Activo' : 'Anulado'
    lines.push(`${m.businessDate},${typeLabel},${fmt(m.amount)},${statusLabel}`)
  }

  return lines.join('\n')
}
