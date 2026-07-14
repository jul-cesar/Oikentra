function readRequiredEnv(name: 'DATABASE_URL' | 'GATEWAY_SHARED_SECRET') {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

function readPort() {
  const rawPort = process.env.PORT?.trim()

  if (!rawPort) {
    return 3000
  }

  const port = Number(rawPort)

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be a valid TCP port')
  }

  return port
}

export const config = {
  databaseUrl: readRequiredEnv('DATABASE_URL'),
  gatewaySharedSecret: readRequiredEnv('GATEWAY_SHARED_SECRET'),
  port: readPort(),
}
