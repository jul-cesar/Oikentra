import type { z } from 'zod'
import type { Credit, CreditPayment } from '../../../db/schema'
import type {
  createCreditSchema,
  createCreditPaymentSchema,
  cancelCreditSchema,
  cancelPaymentSchema,
} from '../credits.schemas'

export type CreateCreditInput = z.infer<typeof createCreditSchema>
export type CreateCreditPaymentInput = z.infer<typeof createCreditPaymentSchema>
export type CancelCreditInput = z.infer<typeof cancelCreditSchema>
export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>

export type CreditResponse = {
  id: string
  customerId: string
  originalAmount: number
  paidAmount: number
  remainingAmount: number
  description: string | null
  creditDate: string
  status: string
  cancellationReason: string | null
  cancelledAt: string | null
  paidAt: string | null
  payments: CreditPaymentResponse[]
  createdAt: string
  updatedAt: string
}

export type CreditPaymentResponse = {
  id: string
  creditId: string
  cashMovementId: string
  amount: number
  paymentDate: string
  note: string | null
  status: string
  cancellationReason: string | null
  cancelledAt: string | null
}

