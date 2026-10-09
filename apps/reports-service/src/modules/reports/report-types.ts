export const reportTypes = [
  'DAILY_SUMMARY',
  'WEEKLY_SUMMARY',
  'PAYMENT_METHODS',
  'RECEIVABLES',
  'AGED_DEBTS',
  'CUSTOMER_STATEMENT',
  'MOVEMENT_HISTORY',
] as const

export type ReportType = (typeof reportTypes)[number]

export const reportFormats = ['PDF', 'CSV', 'XLSX'] as const

export type ReportFormat = (typeof reportFormats)[number]
