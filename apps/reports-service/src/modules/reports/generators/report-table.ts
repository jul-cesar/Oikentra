import type { ReportDataResponse } from '../data-client'
import type { ReportType } from '../report-types'

export type ReportCell = string | number
export type ReportTable = {
  title: string
  period?: string
  summary: Array<[string, ReportCell]>
  columns: string[]
  rows: ReportCell[][]
}

const today = () => new Date().toISOString().slice(0, 10)
const movementLabel = (type: string) => ({
  SALE: 'Venta',
  EXPENSE: 'Gasto',
  CREDIT_PAYMENT: 'Abono de fiado',
  CREDIT_DISBURSEMENT: 'Fiado',
  LOAN_PAYMENT: 'Abono de préstamo',
  LOAN_DISBURSEMENT: 'Préstamo',
} as Record<string, string>)[type] ?? type

export function buildReportTable(
  data: ReportDataResponse,
  input: { reportType: ReportType; from?: string; to?: string; customerId?: string },
): ReportTable {
  switch (input.reportType) {
    case 'DAILY_SUMMARY': {
      const date = input.from ?? today()
      const day = data.dailySummaries.find((item) => item.date === date)
      return {
        title: 'Resumen del día',
        period: date,
        summary: [
          ['Ventas', day?.salesTotal ?? 0],
          ['Abonos recibidos', day?.creditPaymentsTotal ?? 0],
          ['Gastos', day?.expensesTotal ?? 0],
          ['Flujo neto', (day?.salesTotal ?? 0) - (day?.expensesTotal ?? 0)],
          ['Entró', day?.totalIn ?? 0],
          ['Salió', day?.totalOut ?? 0],
          ['Quedó', day?.remaining ?? 0],
        ],
        columns: ['Fecha', 'Ventas', 'Abonos', 'Gastos', 'Flujo neto', 'Entró', 'Salió', 'Quedó'],
        rows: [[date, day?.salesTotal ?? 0, day?.creditPaymentsTotal ?? 0, day?.expensesTotal ?? 0, (day?.salesTotal ?? 0) - (day?.expensesTotal ?? 0), day?.totalIn ?? 0, day?.totalOut ?? 0, day?.remaining ?? 0]],
      }
    }
    case 'WEEKLY_SUMMARY': {
      const days = [...data.dailySummaries].sort((a, b) => a.date.localeCompare(b.date))
      const total = (key: keyof (typeof days)[number]) => days.reduce((sum, day) => sum + Number(day[key]), 0)
      return {
        title: 'Resumen del período',
        period: `${input.from ?? ''} a ${input.to ?? ''}`,
        summary: [
          ['Ventas', total('salesTotal')],
          ['Abonos recibidos', total('creditPaymentsTotal')],
          ['Gastos', total('expensesTotal')],
          ['Flujo neto', total('salesTotal') - total('expensesTotal')],
          ['Entró', total('totalIn')],
          ['Salió', total('totalOut')],
          ['Quedó', total('remaining')],
        ],
        columns: ['Fecha', 'Ventas', 'Abonos', 'Gastos', 'Flujo neto', 'Entró', 'Salió', 'Quedó'],
        rows: days.map((day) => [day.date, day.salesTotal, day.creditPaymentsTotal, day.expensesTotal, day.salesTotal - day.expensesTotal, day.totalIn, day.totalOut, day.remaining]),
      }
    }
    case 'PAYMENT_METHODS': {
      const methods = data.paymentMethods
      return {
        title: 'Ventas por medio de pago',
        period: `${input.from ?? ''} a ${input.to ?? ''}`,
        summary: [
          ['Ventas totales', methods.reduce((sum, item) => sum + item.amount, 0)],
          ['Operaciones', methods.reduce((sum, item) => sum + item.count, 0)],
          ['Medios utilizados', methods.length],
        ],
        columns: ['Medio de pago', 'Monto vendido', 'Cantidad', 'Participación (%)'],
        rows: methods.map((item) => [item.name, item.amount, item.count, item.share]),
      }
    }
    case 'RECEIVABLES':
      return {
        title: 'Fiados por cobrar',
        summary: [
          ['Total por cobrar', data.receivables.totalReceivable],
          ['Clientes con deuda', data.receivables.customersWithDebt],
          ['Deudas antiguas', data.receivables.oldDebts],
        ],
        columns: ['Cliente', 'Deuda pendiente', 'Fiados activos', 'Deuda antigua'],
        rows: data.customers.map((customer) => [customer.name, customer.totalDebt, customer.activeCredits, customer.oldDebt ? 'Sí' : 'No']),
      }
    case 'AGED_DEBTS':
      return {
        title: 'Fiados antiguos',
        summary: [['Deudas antiguas', data.receivables.oldDebts]],
        columns: ['Cliente', 'Deuda pendiente', 'Estado'],
        rows: [...data.customers].sort((a, b) => Number(b.oldDebt) - Number(a.oldDebt)).map((customer) => [customer.name, customer.totalDebt, customer.oldDebt ? 'Antigua' : 'Reciente']),
      }
    case 'MOVEMENT_HISTORY':
      return {
        title: 'Historial de movimientos',
        period: `${input.from ?? ''} a ${input.to ?? ''}`,
        summary: [['Movimientos', data.movements.length]],
        columns: ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Nota', 'Estado'],
        rows: data.movements.map((movement) => [
          movement.businessDate,
          movementLabel(movement.type),
          movement.amount,
          movement.category ?? '',
          movement.note ?? '',
          movement.status === 'ACTIVE' ? 'Activo' : 'Anulado',
        ]),
      }
    case 'CUSTOMER_STATEMENT': {
      const customer = data.customers.find((item) => item.id === input.customerId)
      return {
        title: `Estado de cuenta · ${customer?.name ?? 'Cliente'}`,
        summary: [
          ['Total pendiente en fiados', customer?.totalDebt ?? 0],
          ['Fiados activos', customer?.activeCredits ?? 0],
        ],
        columns: ['Fecha', 'Tipo', 'Monto', 'Estado'],
        rows: data.movements.map((movement) => [
          movement.businessDate,
          movementLabel(movement.type),
          movement.amount,
          movement.status === 'ACTIVE' ? 'Activo' : 'Anulado',
        ]),
      }
    }
  }
}

