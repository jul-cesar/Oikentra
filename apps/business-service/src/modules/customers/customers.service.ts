import type { Customer } from '../../db/schema'
import { AppError } from '../../http/errors'
import { businessesService } from '../businesses/businesses.service'
import { customerRepository, type CustomerRepository } from './customers.repository'
import type { CustomerResponse, CreateCustomerInput, UpdateCustomerInput } from './types/customers.types'

function toCustomerResponse(customer: Customer): CustomerResponse {
  return {
    id: customer.id,
    businessId: customer.businessId,
    name: customer.name,
    phone: customer.phone,
    notes: customer.notes,
    status: customer.status,
    version: customer.version,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    deletedAt: customer.deletedAt?.toISOString() ?? null,
  }
}

export function createCustomersService(repository: CustomerRepository = customerRepository) {
  return {
    async create(userId: string, businessId: string, input: CreateCustomerInput) {
      await businessesService.get(userId, businessId)

      const now = new Date()
      const customer = await repository.create({
        id: crypto.randomUUID(),
        userId,
        businessId,
        name: input.name,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        status: 'ACTIVE',
        version: 1,
        createdAt: now,
        updatedAt: now,
      })
      return toCustomerResponse(customer)
    },

    async list(businessId: string) {
      const records = await repository.findManyByBusiness(businessId)
      return records.map(toCustomerResponse)
    },

    async get(customerId: string, businessId: string) {
      const customer = await repository.findByIdAndBusiness(customerId, businessId)
      if (!customer) {
        throw new AppError('CUSTOMER_NOT_FOUND', 404, 'The customer was not found.')
      }
      return toCustomerResponse(customer)
    },

    async update(customerId: string, businessId: string, input: UpdateCustomerInput) {
      const customer = await repository.updateByIdAndBusiness(customerId, businessId, input)
      if (!customer) {
        throw new AppError('CUSTOMER_NOT_FOUND', 404, 'The customer was not found.')
      }
      return toCustomerResponse(customer)
    },

    async softDelete(customerId: string, businessId: string) {
      const customer = await repository.softDeleteByIdAndBusiness(customerId, businessId)
      if (!customer) {
        throw new AppError('CUSTOMER_NOT_FOUND', 404, 'The customer was not found.')
      }
      return toCustomerResponse(customer)
    },
  }
}

export const customersService = createCustomersService()
