import { eq } from 'drizzle-orm'

import { db } from '../../db/client'
import { userProfiles, type NewUserProfile, type UserProfile } from '../../db/schema'

export type UserProfileRepository = {
  findByUserId(userId: string): Promise<UserProfile | null>
  upsert(userId: string, input: Omit<NewUserProfile, 'userId'>): Promise<UserProfile>
}

export const userProfileRepository: UserProfileRepository = {
  async findByUserId(userId) {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1)
    return profile ?? null
  },

  async upsert(userId, input) {
    const { createdAt: _createdAt, ...update } = input
    const [profile] = await db
      .insert(userProfiles)
      .values({ userId, ...input })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { ...update, updatedAt: new Date() },
      })
      .returning()

    return profile
  },
}
