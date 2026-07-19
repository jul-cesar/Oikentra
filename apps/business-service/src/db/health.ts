import { getDatabaseClient } from './client'

export async function checkDatabaseConnection() {
  await getDatabaseClient().unsafe('select 1')
}
