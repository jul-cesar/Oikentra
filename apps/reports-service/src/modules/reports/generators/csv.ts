import type { ReportDataResponse } from '../data-client'
import type { ReportType } from '../report-types'
import { buildReportTable, type ReportCell } from './report-table'

function cell(value: ReportCell): string {
  if (typeof value === 'number') return String(value)
  const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

function row(values: ReportCell[]): string {
  return values.map(cell).join(',')
}

function generate(data: ReportDataResponse, reportType: ReportType, from?: string, to?: string, customerId?: string): string {
  const table = buildReportTable(data, { reportType, from, to, customerId })
  const rows: ReportCell[][] = [
    ['OIKENTRA', table.title],
    ['Negocio', data.business.name],
    ...(table.period ? [['Período', table.period] as ReportCell[]] : []),
    ['Generado', new Date().toISOString().slice(0, 10)],
    [],
    ...table.summary,
    [],
    table.columns,
    ...table.rows,
  ]
  return rows.map(row).join('\r\n') + '\r\n'
}

export const generateDailySummaryCSV = (data: ReportDataResponse, date: string) => generate(data, 'DAILY_SUMMARY', date)
export const generateWeeklySummaryCSV = (data: ReportDataResponse, from: string, to: string) => generate(data, 'WEEKLY_SUMMARY', from, to)
export const generatePaymentMethodsCSV = (data: ReportDataResponse, from: string, to: string) => generate(data, 'PAYMENT_METHODS', from, to)
export const generateReceivablesCSV = (data: ReportDataResponse) => generate(data, 'RECEIVABLES')
export const generateAgedDebtsCSV = (data: ReportDataResponse) => generate(data, 'AGED_DEBTS')
export const generateMovementHistoryCSV = (data: ReportDataResponse, from: string, to: string) => generate(data, 'MOVEMENT_HISTORY', from, to)
export const generateCustomerStatementCSV = (data: ReportDataResponse, customerId: string) => generate(data, 'CUSTOMER_STATEMENT', undefined, undefined, customerId)
