import { and, desc, eq } from 'drizzle-orm'

import { getDb } from '../../db/client'
import {
  cashMovementCategories,
  type CashMovementCategory,
  type NewCashMovementCategory,
} from '../../db/schema'

export type CashMovementCategoryRepository = {
  create(input: NewCashMovementCategory): Promise<CashMovementCategory>
  findManyByBusiness(businessId: string): Promise<CashMovementCategory[]>
  findByIdAndBusiness(categoryId: string, businessId: string): Promise<CashMovementCategory | null>
  updateByIdAndBusiness(
    categoryId: string,
    businessId: string,
    data: { name: string; updatedAt: Date },
  ): Promise<CashMovementCategory | null>
  deactivateByIdAndBusiness(
    categoryId: string,
    businessId: string,
    updatedAt: Date,
  ): Promise<CashMovementCategory | null>
}

export const cashMovementCategoryRepository: CashMovementCategoryRepository = {
  async create(input) {
    const db = getDb()
    const [category] = await db.insert(cashMovementCategories).values(input).returning()
    return category
  },

  async findManyByBusiness(businessId) {
    const db = getDb()
    return db
      .select()
      .from(cashMovementCategories)
      .where(
        and(
          eq(cashMovementCategories.businessId, businessId),
          eq(cashMovementCategories.status, 'ACTIVE'),
        ),
      )
      .orderBy(desc(cashMovementCategories.createdAt))
  },

  async findByIdAndBusiness(categoryId, businessId) {
    const db = getDb()
    const [category] = await db
      .select()
      .from(cashMovementCategories)
      .where(
        and(
          eq(cashMovementCategories.id, categoryId),
          eq(cashMovementCategories.businessId, businessId),
        ),
      )
      .limit(1)
    return category ?? null
  },

  async updateByIdAndBusiness(categoryId, businessId, data) {
    const db = getDb()
    const [category] = await db
      .update(cashMovementCategories)
      .set({ name: data.name, updatedAt: data.updatedAt })
      .where(
        and(
          eq(cashMovementCategories.id, categoryId),
          eq(cashMovementCategories.businessId, businessId),
          eq(cashMovementCategories.status, 'ACTIVE'),
        ),
      )
      .returning()
    return category ?? null
  },

  async deactivateByIdAndBusiness(categoryId, businessId, updatedAt) {
    const db = getDb()
    const [category] = await db
      .update(cashMovementCategories)
      .set({ status: 'INACTIVE', updatedAt })
      .where(
        and(
          eq(cashMovementCategories.id, categoryId),
          eq(cashMovementCategories.businessId, businessId),
          eq(cashMovementCategories.status, 'ACTIVE'),
        ),
      )
      .returning()
    return category ?? null
  },
}
