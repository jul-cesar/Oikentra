import { describe, expect, test } from 'bun:test'

import { isProfileComplete } from './profile.completion'
import { createProfileService } from './profile.service'
import type { UserProfileRepository } from './profile.repository'
import { patchProfileSchema, replaceProfileSchema } from './profile.schemas'

describe('profile contract', () => {
  test('defaults the country to Colombia and requires location fields', () => {
    expect(replaceProfileSchema.safeParse({ city: 'Sincelejo' }).success).toBe(false)
    expect(
      replaceProfileSchema.safeParse({ department: 'Sucre', city: 'Sincelejo' }).success,
    ).toBe(true)
    const result = replaceProfileSchema.safeParse({ department: 'Sucre', city: 'Sincelejo' })
    if (result.success) expect(result.data.countryCode).toBe('CO')
  })

  test('normalizes country code and accepts an optional phone', () => {
    const result = replaceProfileSchema.safeParse({
      department: 'Sucre',
      city: 'Sincelejo',
      phone: '+57 300 123 4567',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.countryCode).toBe('CO')
  })

  test('rejects an empty patch and marks only valid profiles complete', () => {
    expect(patchProfileSchema.safeParse({}).success).toBe(false)
    expect(isProfileComplete({ countryCode: 'CO', department: null, city: 'Sincelejo' })).toBe(false)
    expect(isProfileComplete({ countryCode: 'CO', department: 'Sucre', city: 'Sincelejo' })).toBe(true)
  })

  test('persists CO when the client omits countryCode', async () => {
    let savedCountryCode: string | undefined
    const repository: UserProfileRepository = {
      findByUserId: async () => null,
      upsert: async (userId, input) => {
        savedCountryCode = input.countryCode
        return {
          userId,
          countryCode: input.countryCode ?? 'CO',
          department: input.department ?? null,
          city: input.city,
          phone: input.phone ?? null,
          profileCompletedAt: input.profileCompletedAt ?? null,
          createdAt: input.createdAt ?? new Date(),
          updatedAt: input.updatedAt ?? new Date(),
        }
      },
    }
    const profile = await createProfileService(repository).replace('user-1', {
      department: 'Sucre',
      city: 'Sincelejo',
      phone: null,
      countryCode: 'CO',
    })

    expect(savedCountryCode).toBe('CO')
    expect(profile.countryCode).toBe('CO')
  })
})
