import { z } from 'zod'

const countryCode = z.string().trim().length(2).transform((value) => value.toUpperCase())
const replaceCountryCode = countryCode.default('CO')
const department = z.string().trim().min(1).max(120)
const city = z.string().trim().min(1).max(120)
const phone = z
  .string()
  .trim()
  .min(7)
  .max(30)
  .regex(/^\+?[0-9 ()-]+$/)
  .nullable()
  .optional()

export const replaceProfileSchema = z
  .object({ countryCode: replaceCountryCode, department, city, phone })
  .refine((value) => value.countryCode === 'CO', {
    path: ['countryCode'],
    message: 'Only Colombia is supported.',
  })

export const patchProfileSchema = z
  .object({
    countryCode: countryCode.optional(),
    department: department.optional(),
    city: city.optional(),
    phone,
  })
  .refine((value) => value.countryCode === undefined || value.countryCode === 'CO', {
    path: ['countryCode'],
    message: 'Only Colombia is supported.',
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.',
  })

export type ReplaceProfileInput = z.infer<typeof replaceProfileSchema>
export type PatchProfileInput = z.infer<typeof patchProfileSchema>
