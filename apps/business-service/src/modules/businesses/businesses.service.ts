import type { Business } from '../../db/schema'
import { AppError } from '../../http/errors'
import { businessRepository, type BusinessRepository } from './businesses.repository'
import type { BusinessResponse, CreateBusinessInput, UpdateBusinessInput } from './types/businesses.types'

function toBusinessResponse(business: Business): BusinessResponse {
  return {
    id: business.id,
    ownerUserId: business.ownerUserId,
    name: business.name,
    businessType: business.businessType,
    currencyCode: business.currencyCode,
    timezone: business.timezone,
    status: business.status,
    version: business.version,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
    deletedAt: business.deletedAt?.toISOString() ?? null,
  }
}

export function createBusinessesService(repository: BusinessRepository = businessRepository) {
  return {
    async create(ownerUserId: string, input: CreateBusinessInput) {
      const now = new Date()
      const business = await repository.create({
        ownerUserId,
        name: input.name,
        businessType: input.businessType ?? null,
        currencyCode: input.currencyCode ?? 'COP',
        timezone: input.timezone ?? 'America/Bogota',
        status: 'ACTIVE',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })

      return toBusinessResponse(business)
    },

    async list(ownerUserId: string) {
      const records = await repository.findManyByOwner(ownerUserId)

      return records.map(toBusinessResponse)
    },

    async get(ownerUserId: string, businessId: string) {
      const business = await repository.findByIdAndOwner(businessId, ownerUserId)

      if (!business) {
        throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
      }

      return toBusinessResponse(business)
    },

    async update(ownerUserId: string, businessId: string, input: UpdateBusinessInput) {
      const business = await repository.updateByIdAndOwner(businessId, ownerUserId, input)

      if (!business) {
        throw new AppError('BUSINESS_NOT_FOUND', 404, 'The business was not found.')
      }

      return toBusinessResponse(business)
    },
  }
}

export const businessesService = createBusinessesService()
