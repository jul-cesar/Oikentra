export type AuthContext = {
  userId: string
  sessionId: string
}

export type BusinessContext = {
  id: string
  name: string
  currencyCode: string
  timezone: string
  status: string
}

export type AppBindings = {
  Variables: {
    requestId: string
    auth: AuthContext
    business: BusinessContext
  }
}
