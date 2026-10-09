import { getConfig } from '../../config/config'
import { AppError } from '../../http/errors'

export type ReportDataResponse = {
  business: {
    id: string
    name: string
    currencyCode: string
    timezone: string
  }
  paymentMethods: Array<{ name: string; amount: number; count: number; share: number }>
  dailySummaries: Array<{
    date: string
    salesTotal: number
    expensesTotal: number
    creditPaymentsTotal: number
    creditCreatedTotal: number
    totalIn: number
    totalOut: number
    remaining: number
  }>
  receivables: {
    totalReceivable: number
    customersWithDebt: number
    oldDebts: number
  }
  customers: Array<{
    id: string
    name: string
    totalDebt: number
    activeCredits: number
    oldDebt: boolean
  }>
  movements: Array<{
    id: string
    type: string
    amount: number
    category: string | null
    note: string | null
    businessDate: string
    status: string
  }>
}

export async function fetchReportData(
  businessId: string,
  reportType: string,
  from?: string,
  to?: string,
  customerId?: string,
  assertion?: string,
): Promise<ReportDataResponse> {
  const config = getConfig()
  const url = new URL("/internal/reports/data", config.businessServiceUrl).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(assertion ? { 'X-Internal-Auth': assertion } : {}),
    },
    body: JSON.stringify({ businessId, reportType, from, to, customerId }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    if (response.status === 401) throw new AppError('UNAUTHENTICATED', 401, 'A valid session is required.')
    if (response.status === 403) throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'You do not have access to this business.')
    if (response.status === 404) {
      throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
    }
    throw new AppError('DEPENDENCY_UNAVAILABLE', 503, 'Could not fetch data from business-service.')
  }

  const json = await response.json() as { data: ReportDataResponse }
  return json.data
}
