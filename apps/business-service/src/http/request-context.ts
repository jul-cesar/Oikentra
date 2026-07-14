export type AuthContext = {
  userId: string
  sessionId: string
}

export type AppBindings = {
  Variables: {
    requestId: string
    auth: AuthContext
  }
}
