import { and, desc, eq, isNull, sql } from 'drizzle-orm'

import { db } from '../../db/client'
import { businesses, type Business, type NewBusiness } from '../../db/schema'
import type { UpdateBusinessInput } from './types/businesses.types'

export type BusinessRepository = {
  create(input: NewBusiness): Promise<Business>
  findManyByOwner(ownerUserId: string): Promise<Business[]>
  findByIdAndOwner(businessId: string, ownerUserId: string): Promise<Business | null>
  updateByIdAndOwner(
    businessId: string,
    ownerUserId: string,
    input: UpdateBusinessInput,
  ): Promise<Business | null>
}

export const businessRepository: BusinessRepository = {
  async create(input) {
    const [business] = await db.insert(businesses).values(input).returning()

    return business
  },

  async findManyByOwner(ownerUserId) {
    return db
      .select()
      .from(businesses)
      .where(and(eq(businesses.ownerUserId, ownerUserId), isNull(businesses.deletedAt)))
      .orderBy(desc(businesses.createdAt))
  },

  async findByIdAndOwner(businessId, ownerUserId) {
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

  async updateByIdAndOwner(businessId, ownerUserId, input) {
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
}
