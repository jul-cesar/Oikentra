import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { businessMembers, type BusinessMember, type NewBusinessMember, type MemberRole } from '../../db/schema'

export type MemberRepository = {
  create(input: NewBusinessMember): Promise<BusinessMember>
  findActiveByBusinessAndUser(businessId: string, userId: string): Promise<BusinessMember | null>
  findById(id: string): Promise<BusinessMember | null>
  listByBusiness(businessId: string): Promise<BusinessMember[]>
  listByUser(userId: string): Promise<BusinessMember[]>
  updateRole(id: string, role: MemberRole): Promise<BusinessMember | null>
  deactivate(id: string): Promise<BusinessMember | null>
}

export const memberRepository: MemberRepository = {
  async create(input) {
    const [member] = await getDb().insert(businessMembers).values(input).returning()
    return member
  },
  async findActiveByBusinessAndUser(businessId, userId) {
    const [member] = await getDb().select().from(businessMembers).where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, userId), eq(businessMembers.status, 'ACTIVE'))).limit(1)
    return member ?? null
  },
  async findById(id) {
    const [member] = await getDb().select().from(businessMembers).where(eq(businessMembers.id, id)).limit(1)
    return member ?? null
  },
  async listByBusiness(businessId) {
    return getDb().select().from(businessMembers).where(eq(businessMembers.businessId, businessId)).orderBy(asc(businessMembers.createdAt))
  },
  async listByUser(userId) {
    return getDb().select().from(businessMembers).where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, 'ACTIVE'))).orderBy(asc(businessMembers.createdAt))
  },
  async updateRole(id, role) {
    const [member] = await getDb().update(businessMembers).set({ role, updatedAt: new Date() }).where(eq(businessMembers.id, id)).returning()
    return member ?? null
  },
  async deactivate(id) {
    const [member] = await getDb().update(businessMembers).set({ status: 'INACTIVE', updatedAt: new Date() }).where(eq(businessMembers.id, id)).returning()
    return member ?? null
  },
}
