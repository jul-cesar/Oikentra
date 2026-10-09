import { AppError } from '../../http/errors'
import { fetchReportData, type ReportDataResponse } from './data-client'
import type { ReportType, ReportFormat } from './report-types'
import { generateXLSX } from './generators/xlsx'
import {
  generateDailySummaryCSV,
  generateWeeklySummaryCSV,
  generatePaymentMethodsCSV,
  generateReceivablesCSV,
  generateAgedDebtsCSV,
  generateMovementHistoryCSV,
  generateCustomerStatementCSV,
} from './generators/csv'
import {
  generateDailySummaryPDF,
  generateWeeklySummaryPDF,
  generatePaymentMethodsPDF,
  generateReceivablesPDF,
  generateAgedDebtsPDF,
  generateMovementHistoryPDF,
  generateCustomerStatementPDF,
} from './generators/pdf'

type GenerateReportInput = {
  reportType: ReportType
  format: ReportFormat
  from?: string
  to?: string
  customerId?: string
  disposition?: 'INLINE' | 'ATTACHMENT'
}

type GenerateReportResult = {
  buffer: Buffer
  contentType: string
  filename: string
}

function getContentType(format: ReportFormat): string {
  return format === 'PDF' ? 'application/pdf' : format === 'CSV' ? 'text/csv; charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

function getFilename(reportType: ReportType, format: ReportFormat, from?: string, to?: string): string {
  const suffix = format.toLowerCase()
  const datePart = `-${to ?? from ?? new Date().toISOString().slice(0, 10)}`

  const names: Record<ReportType, string> = {
    DAILY_SUMMARY: `resumen-diario${datePart}`,
    WEEKLY_SUMMARY: `resumen-periodo${datePart}`,
    PAYMENT_METHODS: `ventas-medios-pago${datePart}`,
    RECEIVABLES: `cuentas-por-cobrar${datePart}`,
    AGED_DEBTS: `deudas-antiguas${datePart}`,
    CUSTOMER_STATEMENT: `estado-cuenta${datePart}`,
    MOVEMENT_HISTORY: `historial-movimientos${datePart}`,
  }

  return `${names[reportType]}.${suffix}`
}

function generateCSV(data: ReportDataResponse, input: GenerateReportInput): string {
  switch (input.reportType) {
    case 'DAILY_SUMMARY':
      return generateDailySummaryCSV(data, input.from ?? new Date().toISOString().slice(0, 10))
    case 'WEEKLY_SUMMARY':
      return generateWeeklySummaryCSV(data, input.from!, input.to!)
    case 'PAYMENT_METHODS':
      return generatePaymentMethodsCSV(data, input.from!, input.to!)
    case 'RECEIVABLES':
      return generateReceivablesCSV(data)
    case 'AGED_DEBTS':
      return generateAgedDebtsCSV(data)
    case 'MOVEMENT_HISTORY':
      return generateMovementHistoryCSV(data, input.from!, input.to!)
    case 'CUSTOMER_STATEMENT':
      return generateCustomerStatementCSV(data, input.customerId!)
  }
}

function generatePDF(data: ReportDataResponse, input: GenerateReportInput): Promise<Buffer> {
  switch (input.reportType) {
    case 'DAILY_SUMMARY':
      return generateDailySummaryPDF(data, input.from ?? new Date().toISOString().slice(0, 10))
    case 'WEEKLY_SUMMARY':
      return generateWeeklySummaryPDF(data, input.from!, input.to!)
    case 'PAYMENT_METHODS':
      return generatePaymentMethodsPDF(data, input.from!, input.to!)
    case 'RECEIVABLES':
      return generateReceivablesPDF(data)
    case 'AGED_DEBTS':
      return generateAgedDebtsPDF(data)
    case 'MOVEMENT_HISTORY':
      return generateMovementHistoryPDF(data, input.from!, input.to!)
    case 'CUSTOMER_STATEMENT':
      return generateCustomerStatementPDF(data, input.customerId!)
  }
}

function generateFile(data: ReportDataResponse, input: GenerateReportInput): Promise<Buffer> {
  if (input.format === 'CSV') {
    return Promise.resolve(Buffer.from('\uFEFF' + generateCSV(data, input), 'utf-8'))
  }
  if (input.format === 'XLSX') return generateXLSX(data, input)
  return generatePDF(data, input)
}

export async function generateReport(
  businessId: string,
  input: GenerateReportInput,
  assertion?: string,
): Promise<GenerateReportResult> {
  try {
    const data = await fetchReportData(
      businessId,
      input.reportType,
      input.from,
      input.to,
      input.customerId,
      assertion,
    )

    const buffer = await generateFile(data, input)

    return {
      buffer,
      contentType: getContentType(input.format),
      filename: getFilename(input.reportType, input.format, input.from, input.to),
    }
  } catch (error) {
    console.error('[reports-service] generate error:', error)
    if (error instanceof AppError) throw error
    throw new AppError('REPORT_GENERATION_FAILED', 500, error instanceof Error ? error.message : 'No fue posible generar el reporte.')
  }
}
