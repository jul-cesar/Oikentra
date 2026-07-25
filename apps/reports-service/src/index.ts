import { app } from './app'
import { getPort, validateRuntimeConfig } from './config/config'

if (import.meta.main) validateRuntimeConfig()

export default {
  port: getPort(),
  fetch: app.fetch,
}
