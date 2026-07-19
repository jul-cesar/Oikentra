import { userProfileRepository, type UserProfileRepository } from './profile.repository'
import { isProfileComplete } from './profile.completion'
import type { PatchProfileInput, ReplaceProfileInput } from './profile.schemas'

export class ProfileValidationError extends Error {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super('The profile is incomplete or invalid.')
  }
}

function toProfileResponse(profile: {
  userId: string
  countryCode: string
  department: string | null
  city: string
  phone: string | null
  profileCompletedAt: Date | null
}) {
  return {
    userId: profile.userId,
    countryCode: profile.countryCode,
    department: profile.department,
    city: profile.city,
    phone: profile.phone,
    profileCompleted: Boolean(profile.profileCompletedAt),
  }
}

export function createProfileService(repository: UserProfileRepository = userProfileRepository) {
  return {
    async get(userId: string) {
      const profile = await repository.findByUserId(userId)
      return profile ? toProfileResponse(profile) : { profileCompleted: false }
    },

    async replace(userId: string, input: ReplaceProfileInput) {
      const now = new Date()
      const profile = await repository.upsert(userId, {
        ...input,
        countryCode: 'CO',
        phone: input.phone ?? null,
        profileCompletedAt: isProfileComplete(input) ? now : null,
        createdAt: now,
        updatedAt: now,
      })

      return toProfileResponse(profile)
    },

    async patch(userId: string, input: PatchProfileInput) {
      const current = await repository.findByUserId(userId)
      if (!current) {
        throw new ProfileValidationError([
          { path: '', message: 'Use PUT to create or complete the profile.' },
        ])
      }

      const merged = {
        countryCode: 'CO',
        department: input.department ?? current.department,
        city: input.city ?? current.city,
      }

      if (!isProfileComplete(merged)) {
        throw new ProfileValidationError([
          { path: 'department', message: 'Department is required for Colombia.' },
        ])
      }

      const now = new Date()
      const profile = await repository.upsert(userId, {
        countryCode: merged.countryCode,
        department: merged.department,
        city: merged.city,
        phone: input.phone === undefined ? current.phone : input.phone,
        profileCompletedAt: current.profileCompletedAt ?? now,
        createdAt: current.createdAt,
        updatedAt: now,
      })

      return toProfileResponse(profile)
    },
  }
}

export const profileService = createProfileService()
