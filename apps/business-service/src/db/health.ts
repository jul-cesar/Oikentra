import { client } from './client'

export async function checkDatabaseConnection() {
  await client.unsafe('select 1')
}
