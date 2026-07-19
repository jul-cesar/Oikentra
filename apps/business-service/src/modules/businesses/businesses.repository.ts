import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm'

import { getDb } from '../../db/client'
import { businesses, type Business, type NewBusiness } from '../../db/schema'
import type { UpdateBusinessInput } from './types/businesses.types'

export type BusinessRepository = {
  create(input: NewBusiness): Promise<Business>
  findManyByOwner(ownerUserId: string): Promise<Business[]>
  findByIdAndOwner(businessId: string, ownerUserId: string): Promise<Business | null>
  findByNameAndOwner(name: string, ownerUserId: string, excludeId?: string): Promise<Business | null>
  updateByIdAndOwner(
    businessId: string,
    ownerUserId: string,
    input: UpdateBusinessInput,
  ): Promise<Business | null>
  softDeleteByIdAndOwner(businessId: string, ownerUserId: string): Promise<Business | null>
}

export const businessRepository: BusinessRepository = {
  async create(input) {
    const db = getDb()
    const [business] = await db.insert(businesses).values(input).returning()

    return business
  },

  async findManyByOwner(ownerUserId) {
    const db = getDb()
    return db
      .select()
      .from(businesses)
      .where(and(eq(businesses.ownerUserId, ownerUserId), isNull(businesses.deletedAt)))
      .orderBy(desc(businesses.createdAt))
  },

  async findByIdAndOwner(businessId, ownerUserId) {
    const db = getDb()
    const [business] = await db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.ownerUserId, ownerUserId),
          isNull(businesses.deletedAt),
        ),
      )
      .limit(1)

    return business ?? null
  },

  async findByNameAndOwner(name, ownerUserId, excludeId) {
    const conditions = [
      eq(businesses.ownerUserId, ownerUserId),
      sql`lower(${businesses.name}) = lower(${name})`,
      eq(businesses.status, 'ACTIVE'),
      isNull(businesses.deletedAt),
    ]

    if (excludeId) {
      conditions.push(ne(businesses.id, excludeId))
    }

    const [business] = await db.select().from(businesses).where(and(...conditions)).limit(1)

    return business ?? null
  },

  async updateByIdAndOwner(businessId, ownerUserId, input) {
    const db = getDb()
    const [business] = await db
      .update(businesses)
      .set({
        ...input,
        updatedAt: new Date(),
        version: sql`${businesses.version} + 1`,
      })
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.ownerUserId, ownerUserId),
          isNull(businesses.deletedAt),
        ),
      )
      .returning()

    return business ?? null
  },

  async softDeleteByIdAndOwner(businessId, ownerUserId) {
    const now = new Date()

    const [business] = await db
      .update(businesses)
      .set({
        status: 'INACTIVE',
        deletedAt: now,
        updatedAt: now,
        version: sql`${businesses.version} + 1`,
      })
      .where(
        and(
          eq(businesses.id, businessId),
          eq(businesses.ownerUserId, ownerUserId),
          isNull(businesses.deletedAt),
        ),
      )
      .returning()

    return business ?? null
  },
}
