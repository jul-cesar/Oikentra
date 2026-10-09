import ExcelJS from 'exceljs'

import type { ReportDataResponse } from '../data-client'
import type { ReportType } from '../report-types'
import { buildReportTable } from './report-table'

const dark = 'FF111827'
const green = 'FF5FE0A0'
const pale = 'FFE9FAF1'
const muted = 'FF64748B'

export async function generateXLSX(
  data: ReportDataResponse,
  input: { reportType: ReportType; from?: string; to?: string; customerId?: string },
): Promise<Buffer> {
  const report = buildReportTable(data, input)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Oikentra'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: report.summary.length + 6 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, orientation: 'landscape' },
  })
  const width = report.columns.length
  sheet.columns = report.columns.map((heading) => ({
    width: Math.min(40, Math.max(18, heading.length + 6)),
  }))

  sheet.mergeCells(1, 1, 1, width)
  const brand = sheet.getCell(1, 1)
  brand.value = 'OIKENTRA  /  REPORTES'
  brand.font = { name: 'Arial', size: 11, bold: true, color: { argb: dark } }
  brand.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } }
  brand.alignment = { vertical: 'middle', indent: 1 }
  sheet.getRow(1).height = 30

  sheet.mergeCells(2, 1, 2, width)
  const title = sheet.getCell(2, 1)
  title.value = report.title
  title.font = { name: 'Arial', size: 19, bold: true, color: { argb: dark } }
  title.alignment = { vertical: 'middle' }
  sheet.getRow(2).height = 34

  sheet.mergeCells(3, 1, 3, width)
  sheet.getCell(3, 1).value = data.business.name + (report.period ? `  ·  ${report.period}` : '')
  sheet.getCell(3, 1).font = { name: 'Arial', size: 10, color: { argb: muted } }

  let rowIndex = 5
  for (const [label, value] of report.summary) {
    const row = sheet.getRow(rowIndex++)
    row.getCell(1).value = label
    row.getCell(2).value = value
    row.getCell(1).font = { name: 'Arial', size: 10, color: { argb: muted } }
    row.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: dark } }
    row.getCell(2).alignment = { horizontal: typeof value === 'number' ? 'right' : 'left' }
    if (typeof value === 'number' && /venta|abono|gasto|flujo|entró|salió|quedó|deuda|cobrar|pendiente/i.test(label)) {
      row.getCell(2).numFmt = '"$"#,##0;[Red]("$"#,##0)'
    }
    row.height = 21
  }

  rowIndex++
  const headerRow = sheet.getRow(rowIndex++)
  report.columns.forEach((heading, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = heading
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: dark } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: green } }
    cell.alignment = { vertical: 'middle' }
  })
  headerRow.height = 27
  sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: width } }

  for (const values of report.rows) {
    const row = sheet.getRow(rowIndex++)
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1)
      const isDate = report.columns[index] === 'Fecha' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      cell.value = isDate ? new Date(value + 'T00:00:00Z') : value
      if (isDate) cell.numFmt = 'dd/mm/yyyy'
      cell.font = { name: 'Arial', size: 10, color: { argb: dark } }
      cell.alignment = { vertical: 'middle', horizontal: typeof value === 'number' ? 'right' : 'left' }
      if (typeof value === 'number' && /venta|abono|gasto|flujo|entró|salió|quedó|monto|deuda|pendiente/i.test(report.columns[index])) {
        cell.numFmt = '"$"#,##0;[Red]("$"#,##0)'
      }
      if (typeof value === 'number' && report.columns[index].includes('(%)')) cell.numFmt = '0.0"%"'
      if (row.number % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pale } }
    })
    row.height = 22
  }
  if (report.rows.length === 0) {
    sheet.mergeCells(rowIndex, 1, rowIndex, width)
    sheet.getCell(rowIndex, 1).value = 'Sin movimientos en este período'
    sheet.getCell(rowIndex, 1).font = { name: 'Arial', italic: true, color: { argb: muted } }
  }
  sheet.properties.defaultRowHeight = 21
  const output = await workbook.xlsx.writeBuffer()
  return Buffer.from(output)
}

