import PdfPrinter from 'pdfmake'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces.js'
import { fileURLToPath } from 'url'

import type { ReportDataResponse } from '../data-client'
import type { ReportType } from '../report-types'
import { buildReportTable, type ReportCell } from './report-table'

const fontsDir = fileURLToPath(new URL('../../../../fonts/', import.meta.url))
const fonts = {
  Roboto: {
    normal: fontsDir + '/Roboto-Regular.ttf',
    bold: fontsDir + '/Roboto-Medium.ttf',
    italics: fontsDir + '/Roboto-Italic.ttf',
    bolditalics: fontsDir + '/Roboto-MediumItalic.ttf',
  },
}

const green = '#64DEA2'
const dark = '#111827'
const muted = '#64748B'
const pale = '#E9FAF1'
const money = (value: number) => '$' + value.toLocaleString('es-CO')
const moneyField = (field: string) => /venta|abono|gasto|flujo|entró|salió|quedó|monto|deuda|pendiente|cobrar/i.test(field)
const display = (value: ReportCell, field: string) =>
  typeof value === 'number' && field.includes('(%)') ? `${value}%` :
  typeof value === 'number' && moneyField(field) ? money(value) : String(value)

function render(data: ReportDataResponse, input: { reportType: ReportType; from?: string; to?: string; customerId?: string }): Promise<Buffer> {
  const report = buildReportTable(data, input)
  const summaryRows: Content[][] = []
  for (let index = 0; index < report.summary.length; index += 2) {
    const pair = report.summary.slice(index, index + 2)
    const cells: Content[] = []
    for (const [label, value] of pair) {
      cells.push({ text: label, color: muted })
      cells.push({ text: display(value, label), bold: true, alignment: 'right', color: dark })
    }
    if (pair.length === 1) cells.push({ text: '' }, { text: '' })
    summaryRows.push(cells)
  }
  const tableRows: Content[][] = [
    report.columns.map((heading) => ({ text: heading, bold: true, color: dark })),
    ...report.rows.map((values) => values.map((value, index) => ({
      text: display(value, report.columns[index]),
      color: dark,
      alignment: typeof value === 'number' ? 'right' as const : 'left' as const,
    }))),
  ]
  if (report.rows.length === 0) {
    tableRows.push(report.columns.map((_, index) => index === 0 ? { text: 'Sin datos en este período', color: muted, italics: true } : { text: '' }))
  }

  const content: Content[] = [
    {
      table: { widths: ['*'], body: [[{ text: 'OIKENTRA   /   REPORTES', bold: true, fontSize: 11, color: dark, margin: [12, 9, 12, 9] }]] },
      layout: { defaultBorder: false, fillColor: () => green },
      margin: [0, 0, 0, 18],
    },
    { text: report.title, fontSize: 22, bold: true, color: dark, margin: [0, 0, 0, 5] },
    { text: data.business.name + (report.period ? '  ·  ' + report.period : ''), fontSize: 10, color: muted, margin: [0, 0, 0, 4] },
    { text: 'Generado el ' + new Date().toLocaleDateString('es-CO'), fontSize: 9, color: muted, margin: [0, 0, 0, 18] },
    { text: 'Resumen', fontSize: 12, bold: true, color: dark, margin: [0, 0, 0, 8] },
    {
      table: { widths: ['*', 105, '*', 105], body: summaryRows },
      layout: { hLineColor: () => '#E5E7EB', vLineWidth: () => 0, paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 8, paddingRight: () => 8 },
      margin: [0, 0, 0, 18],
    },
    { text: 'Detalle', fontSize: 12, bold: true, color: dark, margin: [0, 0, 0, 8] },
    {
      table: { headerRows: 1, widths: report.columns.map(() => '*'), body: tableRows },
      layout: {
        hLineColor: () => '#E5E7EB',
        vLineWidth: () => 0,
        fillColor: (rowIndex: number) => rowIndex === 0 ? green : rowIndex % 2 === 0 ? pale : null,
        paddingTop: () => 7,
        paddingBottom: () => 7,
        paddingLeft: () => 6,
        paddingRight: () => 6,
      },
    },
  ]
  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: report.columns.length > 4 ? 'landscape' : 'portrait',
    pageMargins: [36, 36, 36, 45],
    content,
    defaultStyle: { font: 'Roboto', fontSize: report.columns.length > 5 ? 8 : 9 },
    footer: (page, total) => ({ text: `Oikentra  ·  Página ${page} de ${total}`, alignment: 'right', color: muted, fontSize: 8, margin: [36, 0, 36, 0] }),
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PdfPrinter(fonts).createPdfKitDocument(docDef)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

export const generateDailySummaryPDF = (data: ReportDataResponse, date: string) => render(data, { reportType: 'DAILY_SUMMARY', from: date })
export const generateWeeklySummaryPDF = (data: ReportDataResponse, from: string, to: string) => render(data, { reportType: 'WEEKLY_SUMMARY', from, to })
export const generatePaymentMethodsPDF = (data: ReportDataResponse, from: string, to: string) => render(data, { reportType: 'PAYMENT_METHODS', from, to })
export const generateReceivablesPDF = (data: ReportDataResponse) => render(data, { reportType: 'RECEIVABLES' })
export const generateAgedDebtsPDF = (data: ReportDataResponse) => render(data, { reportType: 'AGED_DEBTS' })
export const generateMovementHistoryPDF = (data: ReportDataResponse, from: string, to: string) => render(data, { reportType: 'MOVEMENT_HISTORY', from, to })
export const generateCustomerStatementPDF = (data: ReportDataResponse, customerId: string) => render(data, { reportType: 'CUSTOMER_STATEMENT', customerId })
