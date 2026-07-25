import { getConfig } from '../../config/config'
import { AppError } from '../../http/errors'

export type ReportDataResponse = {
  business: {
    id: string
    name: string
    currencyCode: string
    timezone: string
  }
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
): Promise<ReportDataResponse> {
  const config = getConfig()
  const url = `${config.businessServiceUrl}/internal/reports/data`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Service': 'reports-service',
    },
    body: JSON.stringify({ businessId, reportType, from, to, customerId }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    if (response.status === 404) {
      throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
    }
    throw new AppError('DEPENDENCY_UNAVAILABLE', 503, 'Could not fetch data from business-service.')
  }

  const json = await response.json() as { data: ReportDataResponse }
  return json.data
}
