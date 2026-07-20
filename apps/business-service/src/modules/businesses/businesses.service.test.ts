import { describe, expect, test } from 'bun:test'

import type { Business, NewBusiness } from '../../db/schema'
import { createBusinessesService } from './businesses.service'
import type { BusinessRepository } from './businesses.repository'
import type { UpdateBusinessInput } from './types/businesses.types'

function createInMemoryBusinessRepository(seed: Business[] = []): BusinessRepository {
  const records = new Map<string, Business>(seed.map((business) => [business.id, business]))

  return {
    async create(input: NewBusiness) {
      records.set(input.id, input as Business)
      return input as Business
    },

    async findManyByOwner(ownerUserId: string) {
      return Array.from(records.values()).filter(
        (business) => business.ownerUserId === ownerUserId && !business.deletedAt,
      )
    },

    async findByIdAndOwner(businessId: string, ownerUserId: string) {
      const business = records.get(businessId)
      if (!business || business.ownerUserId !== ownerUserId || business.deletedAt) {
        return null
      }
      return business
    },

    async findByNameAndOwner(name: string, ownerUserId: string, excludeId?: string) {
      const normalized = name.toLowerCase()
      return (
        Array.from(records.values()).find(
          (business) =>
            business.ownerUserId === ownerUserId &&
            business.name.toLowerCase() === normalized &&
            business.status === 'ACTIVE' &&
            !business.deletedAt &&
            business.id !== excludeId,
        ) ?? null
      )
    },

    async updateByIdAndOwner(businessId: string, ownerUserId: string, input: UpdateBusinessInput) {
      const business = records.get(businessId)
      if (!business || business.ownerUserId !== ownerUserId || business.deletedAt) {
        return null
      }
      const updated = { ...business, ...input, updatedAt: new Date() } as Business
      records.set(businessId, updated)
      return updated
    },

    async softDeleteByIdAndOwner(businessId: string, ownerUserId: string) {
      const business = records.get(businessId)
      if (!business || business.ownerUserId !== ownerUserId || business.deletedAt) {
        return null
      }
      const now = new Date()
      const updated = { ...business, status: 'INACTIVE', deletedAt: now, updatedAt: now } as Business
      records.set(businessId, updated)
      return updated
    },
  }
}

function makeBusiness(overrides: Partial<Business> = {}): Business {
  const now = new Date()
  return {
    id: crypto.randomUUID(),
    ownerUserId: 'owner-a',
    name: 'Business',
    businessType: 'STORE',
    currencyCode: 'COP',
    timezone: 'America/Bogota',
    status: 'ACTIVE',
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('businesses service owner scoping', () => {
  test('create assigns the requesting user as owner', async () => {
    const service = createBusinessesService(createInMemoryBusinessRepository())

    const business = await service.create('owner-a', { name: 'Tienda A' })

    expect(business.ownerUserId).toBe('owner-a')
  })

  test('list only returns businesses owned by the requesting user', async () => {
    const repository = createInMemoryBusinessRepository([
      makeBusiness({ ownerUserId: 'owner-a', name: 'Tienda A' }),
      makeBusiness({ ownerUserId: 'owner-b', name: 'Tienda B' }),
    ])
    const service = createBusinessesService(repository)

    const records = await service.list('owner-a')

    expect(records).toHaveLength(1)
    expect(records[0].name).toBe('Tienda A')
  })

  test('get rejects a business owned by another user', async () => {
    const business = makeBusiness({ ownerUserId: 'owner-a' })
    const service = createBusinessesService(createInMemoryBusinessRepository([business]))

    await expect(service.get('owner-b', business.id)).rejects.toThrow('The business was not found.')
  })

  test('update rejects a business owned by another user', async () => {
    const business = makeBusiness({ ownerUserId: 'owner-a' })
    const service = createBusinessesService(createInMemoryBusinessRepository([business]))

    await expect(service.update('owner-b', business.id, { name: 'Hacked' })).rejects.toThrow(
      'The business was not found.',
    )
  })

  test('softDelete rejects a business owned by another user', async () => {
    const business = makeBusiness({ ownerUserId: 'owner-a' })
    const service = createBusinessesService(createInMemoryBusinessRepository([business]))

    await expect(service.softDelete('owner-b', business.id)).rejects.toThrow(
      'The business was not found.',
    )
  })
})
