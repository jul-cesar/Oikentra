import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const businessStatuses = ['ACTIVE', 'INACTIVE'] as const

export type BusinessStatus = (typeof businessStatuses)[number]

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerUserId: text('owner_user_id').notNull(),
    name: text('name').notNull(),
    businessType: text('business_type'),
    currencyCode: text('currency_code').notNull().default('COP'),
    timezone: text('timezone').notNull().default('America/Bogota'),
    status: text('status', { enum: businessStatuses }).notNull().default('ACTIVE'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('businesses_owner_user_id_idx').on(table.ownerUserId),
    index('businesses_owner_user_id_status_idx').on(table.ownerUserId, table.status),
  ],
)

export type Business = typeof businesses.$inferSelect
export type NewBusiness = typeof businesses.$inferInsert
