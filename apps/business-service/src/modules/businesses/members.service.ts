import { AppError } from '../../http/errors'
import { memberRepository, type MemberRepository } from './members.repository'
import type { MemberRole } from '../../db/schema'

export const permissions = {
  customersRead: 'customers.read', customersCreate: 'customers.create', customersUpdate: 'customers.update', customersArchive: 'customers.archive',
  creditsRead: 'credits.read', creditsCreate: 'credits.create', creditsCancel: 'credits.cancel',
  paymentsCreate: 'payments.create', paymentsCancel: 'payments.cancel',
  cashRead: 'cash.read', cashCreate: 'cash.create', cashCancel: 'cash.cancel',
  membersManage: 'members.manage', reportsRead: 'reports.read',
} as const

const rolePermissions: Record<MemberRole, readonly string[]> = {
  OWNER: Object.values(permissions),
  MANAGER: Object.values(permissions).filter((permission) => permission !== permissions.membersManage),
  OPERATOR: [permissions.customersRead, permissions.customersCreate, permissions.creditsRead, permissions.creditsCreate, permissions.paymentsCreate, permissions.cashRead, permissions.cashCreate],
}

function toResponse(member: Awaited<ReturnType<MemberRepository['findById']>> extends infer T ? Exclude<T, null> : never) {
  return { id: member.id, businessId: member.businessId, userId: member.userId, role: member.role, status: member.status, createdAt: member.createdAt.toISOString(), updatedAt: member.updatedAt.toISOString() }
}

export function createMembersService(repository: MemberRepository = memberRepository) {
  return {
    async requirePermission(userId: string, businessId: string, permission: string) {
      const member = await repository.findActiveByBusinessAndUser(businessId, userId)
      if (!member) throw new AppError('BUSINESS_ACCESS_DENIED', 403, 'You do not have access to this business.')
      if (!rolePermissions[member.role].includes(permission)) throw new AppError('BUSINESS_PERMISSION_DENIED', 403, 'You do not have permission to perform this action.')
      return member
    },
    async list(userId: string, businessId: string) {
      await this.requirePermission(userId, businessId, permissions.membersManage)
      return (await repository.listByBusiness(businessId)).map(toResponse)
    },
    async add(ownerUserId: string, businessId: string, input: { userId: string; role: MemberRole }) {
      await this.requirePermission(ownerUserId, businessId, permissions.membersManage)
      if (input.role === 'OWNER') throw new AppError('INVALID_MEMBER_ROLE', 400, 'A business can only have one owner.')
      const now = new Date()
      return toResponse(await repository.create({ id: crypto.randomUUID(), businessId, userId: input.userId, role: input.role, status: 'ACTIVE', createdAt: now, updatedAt: now }))
    },
    async updateRole(ownerUserId: string, businessId: string, memberId: string, role: MemberRole) {
      await this.requirePermission(ownerUserId, businessId, permissions.membersManage)
      const member = await repository.findById(memberId)
      if (!member || member.businessId !== businessId) throw new AppError('MEMBER_NOT_FOUND', 404, 'The member was not found.')
      if (member.role === 'OWNER' || role === 'OWNER') throw new AppError('INVALID_MEMBER_ROLE', 400, 'The owner role cannot be changed here.')
      const updated = await repository.updateRole(memberId, role)
      if (!updated) throw new AppError('MEMBER_NOT_FOUND', 404, 'The member was not found.')
      return toResponse(updated)
    },
    async remove(ownerUserId: string, businessId: string, memberId: string) {
      await this.requirePermission(ownerUserId, businessId, permissions.membersManage)
      const member = await repository.findById(memberId)
      if (!member || member.businessId !== businessId) throw new AppError('MEMBER_NOT_FOUND', 404, 'The member was not found.')
      if (member.role === 'OWNER') throw new AppError('OWNER_CANNOT_BE_REMOVED', 400, 'The business owner cannot be removed.')
      const removed = await repository.deactivate(memberId)
      if (!removed) throw new AppError('MEMBER_NOT_FOUND', 404, 'The member was not found.')
      return toResponse(removed)
    },
  }
}

export const membersService = createMembersService()
