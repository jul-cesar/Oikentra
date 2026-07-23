import type { CashMovementCategory } from '../../db/schema'
import { AppError } from '../../http/errors'
import { membersService, permissions } from '../businesses/members.service'
import {
  cashMovementCategoryRepository,
  type CashMovementCategoryRepository,
} from './cash-movement-categories.repository'

export type CashMovementCategoryResponse = {
  id: string
  businessId: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

function toCategoryResponse(category: CashMovementCategory): CashMovementCategoryResponse {
  return {
    id: category.id,
    businessId: category.businessId,
    name: category.name,
    status: category.status,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  }
}

export function createCashMovementCategoriesService(
  repository: CashMovementCategoryRepository = cashMovementCategoryRepository,
) {
  return {
    async create(userId: string, businessId: string, input: { name: string }) {
      await membersService.requirePermission(userId, businessId, permissions.cashCreate)

      const now = new Date()
      const category = await repository.create({
        id: crypto.randomUUID(),
        businessId,
        name: input.name,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      })

      return toCategoryResponse(category)
    },

    async list(userId: string, businessId: string) {
      await membersService.requirePermission(userId, businessId, permissions.cashRead)

      const categories = await repository.findManyByBusiness(businessId)
      return categories.map(toCategoryResponse)
    },

    async update(userId: string, businessId: string, categoryId: string, input: { name: string }) {
      await membersService.requirePermission(userId, businessId, permissions.cashCreate)

      const category = await repository.updateByIdAndBusiness(categoryId, businessId, {
        name: input.name,
        updatedAt: new Date(),
      })

      if (!category) {
        throw new AppError('CATEGORY_NOT_FOUND', 404, 'The category was not found.')
      }

      return toCategoryResponse(category)
    },

    async deactivate(userId: string, businessId: string, categoryId: string) {
      await membersService.requirePermission(userId, businessId, permissions.cashCancel)

      const category = await repository.deactivateByIdAndBusiness(
        categoryId,
        businessId,
        new Date(),
      )

      if (!category) {
        throw new AppError('CATEGORY_NOT_FOUND', 404, 'The category was not found.')
      }

      return toCategoryResponse(category)
    },
  }
}

export const cashMovementCategoriesService = createCashMovementCategoriesService()
