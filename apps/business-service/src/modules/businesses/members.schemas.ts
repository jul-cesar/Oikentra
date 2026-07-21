import { z } from 'zod'
import { memberRoles } from '../../db/schema'

export const memberParamsSchema = z.object({ businessId: z.string().min(1), memberId: z.string().min(1) })
export const addMemberSchema = z.object({ userId: z.string().trim().min(1), role: z.enum(memberRoles).default('OPERATOR') })
export const updateMemberSchema = z.object({ role: z.enum(memberRoles) })
