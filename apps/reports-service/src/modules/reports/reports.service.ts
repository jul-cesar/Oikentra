import { AppError } from '../../http/errors'
import { fetchReportData, type ReportDataResponse } from './data-client'
import type { ReportType, ReportFormat } from './report-types'
import {
  generateDailySummaryCSV,
  generateWeeklySummaryCSV,
  generateReceivablesCSV,
  generateAgedDebtsCSV,
  generateMovementHistoryCSV,
  generateCustomerStatementCSV,
} from './generators/csv'
import {
  generateDailySummaryPDF,
  generateWeeklySummaryPDF,
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
  return format === 'PDF' ? 'application/pdf' : 'text/csv; charset=utf-8'
}

function getFilename(reportType: ReportType, format: ReportFormat, from?: string, to?: string): string {
  const suffix = format === 'PDF' ? 'pdf' : 'csv'
  const datePart = from && to ? `-${to}` : `-${new Date().toISOString().slice(0, 10)}`

  const names: Record<ReportType, string> = {
    DAILY_SUMMARY: `resumen-diario${datePart}`,
    WEEKLY_SUMMARY: `resumen-semanal${datePart}`,
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

function generatePDF(data: ReportDataResponse, input: GenerateReportInput): Buffer {
  switch (input.reportType) {
    case 'DAILY_SUMMARY':
      return generateDailySummaryPDF(data, input.from ?? new Date().toISOString().slice(0, 10))
    case 'WEEKLY_SUMMARY':
      return generateWeeklySummaryPDF(data, input.from!, input.to!)
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

function generateFile(data: ReportDataResponse, input: GenerateReportInput): Buffer {
  if (input.format === 'CSV') {
    return Buffer.from(generateCSV(data, input), 'utf-8')
  }
  return generatePDF(data, input)
}

export async function generateReport(
  businessId: string,
  input: GenerateReportInput,
): Promise<GenerateReportResult> {
  try {
    const data = await fetchReportData(
      businessId,
      input.reportType,
      input.from,
      input.to,
      input.customerId,
    )

    const buffer = generateFile(data, input)

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
