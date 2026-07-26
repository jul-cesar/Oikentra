import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces.js'
import path from 'path'

import type { ReportDataResponse } from '../data-client'

const fontsDir = path.resolve(import.meta.dir, '../../../fonts')

const fonts = {
  Roboto: {
    normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
  },
}

function formatCOP(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function headerSection(title: string, businessName: string, dateRange?: string): Content[] {
  const items: Content[] = [
    { text: title, style: 'title' },
    { text: `Negocio: ${businessName}`, style: 'subtitle' },
  ]
  if (dateRange) items.push({ text: `Periodo: ${dateRange}`, style: 'subtitle' })
  items.push({ text: `Generado: ${new Date().toLocaleDateString('es-CO')}`, style: 'meta' })
  items.push({ text: '', margin: [0, 10, 0, 10] as [number, number, number, number] })
  return items
}

function totalsTable(rows: [string, string][]): Content {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[][] = [
    [{ text: 'Concepto', style: 'tableHeader' }, { text: 'Monto', style: 'tableHeader' }],
    ...rows.map(([label, value]) => [label, { text: value, alignment: 'right' }]),
  ]

  return {
    table: {
      widths: ['*', 'auto'],
      body,
    },
    margin: [0, 5, 0, 10] as [number, number, number, number],
  }
}

function renderPdf(docDef: TDocumentDefinitions): Buffer {
  const printer = new PdfPrinter(fonts)
  const pdfDoc = printer.createPdfKitDocument(docDef)
  const chunks: Buffer[] = []
  // pdfmake is synchronous in server mode with PdfPrinter
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', reject)
    pdfDoc.end()
  }) as unknown as Buffer
}

// ─── Daily Summary ──────────────────────────────────────────

export function generateDailySummaryPDF(data: ReportDataResponse, date: string): Buffer {
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

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection('RESUMEN DEL DÍA', data.business.name, formatDate(date)),
      totalsTable([
        ['Entró', formatCOP(summary.totalIn)],
        ['Salió', formatCOP(summary.totalOut)],
        ['Quedó', formatCOP(summary.remaining)],
      ]),
      { text: 'Detalle', style: 'sectionHeader' },
      totalsTable([
        ['Ventas de contado', formatCOP(summary.salesTotal)],
        ['Abonos recibidos', formatCOP(summary.creditPaymentsTotal)],
        ['Gastos', formatCOP(summary.expensesTotal)],
        ['Fiados nuevos', formatCOP(summary.creditCreatedTotal)],
      ]),
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] as [number, number, number, number] },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}

// ─── Weekly Summary ─────────────────────────────────────────

export function generateWeeklySummaryPDF(data: ReportDataResponse, from: string, to: string): Buffer {
  const body: Content[][] = [
    [
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Entró', style: 'tableHeader' },
      { text: 'Salió', style: 'tableHeader' },
      { text: 'Quedó', style: 'tableHeader' },
    ],
  ]

  for (const day of data.dailySummaries) {
    body.push([
      formatDate(day.date),
      { text: formatCOP(day.totalIn), alignment: 'right' },
      { text: formatCOP(day.totalOut), alignment: 'right' },
      { text: formatCOP(day.remaining), alignment: 'right' },
    ])
  }

  const totals = data.dailySummaries.reduce(
    (acc, d) => ({ totalIn: acc.totalIn + d.totalIn, totalOut: acc.totalOut + d.totalOut }),
    { totalIn: 0, totalOut: 0 },
  )

  body.push([
    { text: 'TOTAL', bold: true },
    { text: formatCOP(totals.totalIn), alignment: 'right', bold: true },
    { text: formatCOP(totals.totalOut), alignment: 'right', bold: true },
    { text: formatCOP(totals.totalIn - totals.totalOut), alignment: 'right', bold: true },
  ])

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection('RESUMEN SEMANAL', data.business.name, `${formatDate(from)} - ${formatDate(to)}`),
      {
        table: { widths: ['*', 'auto', 'auto', 'auto'], body },
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}

// ─── Receivables ────────────────────────────────────────────

export function generateReceivablesPDF(data: ReportDataResponse): Buffer {
  const body: Content[][] = [
    [
      { text: 'Cliente', style: 'tableHeader' },
      { text: 'Deuda', style: 'tableHeader' },
      { text: 'Fiados', style: 'tableHeader' },
      { text: 'Antigua', style: 'tableHeader' },
    ],
  ]

  for (const c of data.customers) {
    body.push([
      c.name,
      { text: formatCOP(c.totalDebt), alignment: 'right' },
      { text: String(c.activeCredits), alignment: 'center' },
      { text: c.oldDebt ? 'Sí' : 'No', alignment: 'center' },
    ])
  }

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection('CUENTAS POR COBRAR', data.business.name),
      totalsTable([
        ['Total por cobrar', formatCOP(data.receivables.totalReceivable)],
        ['Clientes con deuda', String(data.receivables.customersWithDebt)],
        ['Deudas antiguas', String(data.receivables.oldDebts)],
      ]),
      {
        table: { widths: ['*', 'auto', 'auto', 'auto'], body },
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] as [number, number, number, number] },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}

// ─── Aged Debts ─────────────────────────────────────────────

export function generateAgedDebtsPDF(data: ReportDataResponse): Buffer {
  const body: Content[][] = [
    [
      { text: 'Cliente', style: 'tableHeader' },
      { text: 'Deuda', style: 'tableHeader' },
      { text: 'Estado', style: 'tableHeader' },
    ],
  ]

  for (const c of data.customers.filter((c) => c.oldDebt)) {
    body.push([c.name, { text: formatCOP(c.totalDebt), alignment: 'right' }, 'Antigua'])
  }
  for (const c of data.customers.filter((c) => !c.oldDebt && c.totalDebt > 0)) {
    body.push([c.name, { text: formatCOP(c.totalDebt), alignment: 'right' }, 'Reciente'])
  }

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection('DEUDAS ANTIGUAS', data.business.name),
      {
        table: { widths: ['*', 'auto', 'auto'], body },
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}

// ─── Movement History ───────────────────────────────────────

export function generateMovementHistoryPDF(data: ReportDataResponse, from: string, to: string): Buffer {
  const body: Content[][] = [
    [
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Tipo', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader' },
      { text: 'Estado', style: 'tableHeader' },
    ],
  ]

  for (const m of data.movements) {
    const typeLabel = m.type === 'SALE' ? 'Venta' : m.type === 'EXPENSE' ? 'Gasto' : 'Abono'
    const statusLabel = m.status === 'ACTIVE' ? 'Activo' : 'Anulado'
    body.push([
      formatDate(m.businessDate),
      typeLabel,
      { text: formatCOP(m.amount), alignment: 'right' },
      statusLabel,
    ])
  }

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection('HISTORIAL DE MOVIMIENTOS', data.business.name, `${formatDate(from)} - ${formatDate(to)}`),
      {
        table: { widths: ['auto', '*', 'auto', 'auto'], body },
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}

// ─── Customer Statement ─────────────────────────────────────

export function generateCustomerStatementPDF(data: ReportDataResponse, customerId: string): Buffer {
  const customer = data.customers.find((c) => c.id === customerId)
  const customerName = customer?.name ?? 'Desconocido'

  const body: Content[][] = [
    [
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Tipo', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader' },
      { text: 'Estado', style: 'tableHeader' },
    ],
  ]

  for (const m of data.movements) {
    const typeLabel = m.type === 'SALE' ? 'Venta' : m.type === 'EXPENSE' ? 'Gasto' : 'Abono'
    const statusLabel = m.status === 'ACTIVE' ? 'Activo' : 'Anulado'
    body.push([
      formatDate(m.businessDate),
      typeLabel,
      { text: formatCOP(m.amount), alignment: 'right' },
      statusLabel,
    ])
  }

  const docDef: TDocumentDefinitions = {
    content: [
      ...headerSection(`ESTADO DE CUENTA: ${customerName}`, data.business.name),
      totalsTable([
        ['Total pendiente', formatCOP(customer?.totalDebt ?? 0)],
        ['Fiados activos', String(customer?.activeCredits ?? 0)],
      ]),
      {
        table: { widths: ['auto', '*', 'auto', 'auto'], body },
        margin: [0, 5, 0, 10] as [number, number, number, number],
      },
    ],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    styles: {
      title: { fontSize: 16, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      subtitle: { fontSize: 11, margin: [0, 2, 0, 2] as [number, number, number, number] },
      meta: { fontSize: 9, color: '#666666' },
      sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] as [number, number, number, number] },
      tableHeader: { bold: true, fillColor: '#f0f0f0' },
    },
  }

  return renderPdf(docDef)
}
