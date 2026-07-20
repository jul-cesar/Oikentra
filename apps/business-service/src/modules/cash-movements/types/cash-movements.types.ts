import type { z } from 'zod'
import type { CashMovement, CashMovementStatus, CashMovementType } from '../../../db/schema'
import type { createSaleSchema, cancelCashMovementSchema } from '../cash-movements.schemas'

export type CreateCashMovementInput = z.infer<typeof createSaleSchema>
export type CancelCashMovementInput = z.infer<typeof cancelCashMovementSchema>

export type CashMovementResponse = {
  id: string
  businessId: string
  type: CashMovementType
  amount: number
  category: string | null
  note: string | null
  businessDate: string
  occurredAt: string
  status: CashMovementStatus
  sourceType: string | null
  sourceId: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

export type CashMovementRecord = CashMovement
