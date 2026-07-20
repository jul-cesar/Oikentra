import { and, desc, eq, sql } from 'drizzle-orm'

import { getDb } from '../../db/client'
import { cashMovements, type CashMovement, type NewCashMovement } from '../../db/schema'
import type { CancelCashMovementInput } from './types/cash-movements.types'

export type CashMovementRepository = {
  create(input: NewCashMovement): Promise<CashMovement>
  findManyByBusiness(businessId: string): Promise<CashMovement[]>
  findByIdAndBusiness(movementId: string, businessId: string): Promise<CashMovement | null>
  cancelByIdAndBusiness(
    movementId: string,
    businessId: string,
    input: CancelCashMovementInput,
  ): Promise<CashMovement | null>
}

export const cashMovementRepository: CashMovementRepository = {
  async create(input) {
    const db = getDb()
    const [movement] = await db.insert(cashMovements).values(input).returning()
    return movement
  },

  async findManyByBusiness(businessId) {
    const db = getDb()
    return db
      .select()
      .from(cashMovements)
      .where(and(eq(cashMovements.businessId, businessId), eq(cashMovements.status, 'ACTIVE')))
      .orderBy(desc(cashMovements.occurredAt))
  },

  async findByIdAndBusiness(movementId, businessId) {
    const db = getDb()
    const [movement] = await db
      .select()
      .from(cashMovements)
      .where(and(eq(cashMovements.id, movementId), eq(cashMovements.businessId, businessId)))
      .limit(1)
    return movement ?? null
  },

  async cancelByIdAndBusiness(movementId, businessId, input) {
    const db = getDb()
    const now = new Date()

    const [movement] = await db
      .update(cashMovements)
      .set({
        status: 'CANCELLED',
        cancellationReason: input.reason,
        cancelledAt: now,
        updatedAt: now,
        version: sql`${cashMovements.version} + 1`,
      })
      .where(
        and(
          eq(cashMovements.id, movementId),
          eq(cashMovements.businessId, businessId),
          eq(cashMovements.status, 'ACTIVE'),
        ),
      )
      .returning()

    return movement ?? null
  },
}
