import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const client = postgres(databaseUrl)

export const db = drizzle(client, { schema })

export async function checkDatabaseConnection() {
  await client.unsafe('select 1')
}
