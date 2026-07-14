import { app } from './app'
import { config } from './config/config'

export default {
  port: config.port,
  fetch: app.fetch,
}
