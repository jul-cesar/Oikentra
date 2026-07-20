import type { Customer, CustomerStatus } from '../../../db/schema'
import type { z } from 'zod'
import type { createCustomerSchema, updateCustomerSchema } from '../customers.schemas'

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

export type CustomerResponse = {
  id: string
  businessId: string
  name: string
  phone: string | null
  notes: string | null
  status: CustomerStatus
  version: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type CustomerRecord = Customer
