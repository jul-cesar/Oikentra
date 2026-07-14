import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { config } from '../config/config'
import * as schema from './schema'

export const client = postgres(config.databaseUrl)

export const db = drizzle(client, { schema })
