import type { CashMovement } from '../../db/schema'
import { AppError } from '../../http/errors'
import { cashMovementRepository, type CashMovementRepository } from './cash-movements.repository'
import { membersService, permissions } from '../businesses/members.service'
import type {
  CashMovementResponse,
  CreateCashMovementInput,
  CancelCashMovementInput,
} from './types/cash-movements.types'

function toCashMovementResponse(movement: CashMovement): CashMovementResponse {
  return {
    id: movement.id,
    businessId: movement.businessId,
    userId: movement.userId,
    type: movement.type,
    amount: movement.amount,
    category: movement.category,
    note: movement.note,
    businessDate: movement.businessDate,
    occurredAt: movement.occurredAt.toISOString(),
    status: movement.status,
    sourceType: movement.sourceType,
    sourceId: movement.sourceId,
    cancellationReason: movement.cancellationReason,
    cancelledAt: movement.cancelledAt?.toISOString() ?? null,
    version: movement.version,
    createdAt: movement.createdAt.toISOString(),
    updatedAt: movement.updatedAt.toISOString(),
  }
}

export function createCashMovementsService(repository: CashMovementRepository = cashMovementRepository) {
  return {
    async createSale(userId: string, businessId: string, input: CreateCashMovementInput) {
      await membersService.requirePermission(userId, businessId, permissions.cashCreate)

      const now = new Date()
      const movement = await repository.create({
        id: crypto.randomUUID(),
        userId,
        businessId,
        type: 'SALE',
        amount: input.amount,
        category: input.category ?? null,
        note: input.note ?? null,
        businessDate: input.businessDate,
        occurredAt: new Date(input.occurredAt),
        status: 'ACTIVE',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      return toCashMovementResponse(movement)
    },

    async createExpense(userId: string, businessId: string, input: CreateCashMovementInput) {
      await membersService.requirePermission(userId, businessId, permissions.cashCreate)

      const now = new Date()
      const movement = await repository.create({
        id: crypto.randomUUID(),
        userId,
        businessId,
        type: 'EXPENSE',
        amount: input.amount,
        category: input.category ?? null,
        note: input.note ?? null,
        businessDate: input.businessDate,
        occurredAt: new Date(input.occurredAt),
        status: 'ACTIVE',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      return toCashMovementResponse(movement)
    },

    async list(userId: string, businessId: string) {
      await membersService.requirePermission(userId, businessId, permissions.cashRead)

      const records = await repository.findManyByBusiness(businessId)
      return records.map(toCashMovementResponse)
    },

    async cancel(userId: string, movementId: string, businessId: string, input: CancelCashMovementInput) {
      await membersService.requirePermission(userId, businessId, permissions.cashCancel)

      const movement = await repository.cancelByIdAndBusiness(movementId, businessId, input)

      if (!movement) {
        throw new AppError('MOVEMENT_NOT_FOUND', 404, 'The cash movement was not found.')
      }

      return toCashMovementResponse(movement)
    },
  }
}

export const cashMovementsService = createCashMovementsService()
