import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose'

export const INTERNAL_AUTH_ISSUER = 'oikentra.internal-auth'
export const INTERNAL_AUTH_ALGORITHM = 'RS256'
export const INTERNAL_AUTH_TOKEN_TTL_SECONDS = 60

export type InternalAuthAssertion = {
  userId: string
  sessionId: string
  audience: string | string[]
  issuedAt: number
  expiresAt: number
}

type AssertionPayload = {
  sid?: unknown
}

function decodeBase64(value: string) {
  try {
    return atob(value)
  } catch {
    throw new Error('Internal auth key must be valid base64')
  }
}

export function base64PemToString(value: string) {
  return decodeBase64(value.trim())
}

export async function issueInternalAssertion({
  privateKeyBase64,
  userId,
  sessionId,
  audience,
  now = Math.floor(Date.now() / 1000),
  ttlSeconds = INTERNAL_AUTH_TOKEN_TTL_SECONDS,
}: {
  privateKeyBase64: string
  userId: string
  sessionId: string
  audience: string | string[]
  now?: number
  ttlSeconds?: number
}) {
  const privateKey = await importPKCS8(base64PemToString(privateKeyBase64), INTERNAL_AUTH_ALGORITHM)

  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: INTERNAL_AUTH_ALGORITHM, typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(INTERNAL_AUTH_ISSUER)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(privateKey)
}

export async function verifyInternalAssertion({
  token,
  publicKeyBase64,
  audience,
  now,
}: {
  token: string
  publicKeyBase64: string
  audience: string
  now?: number
}): Promise<InternalAuthAssertion> {
  const publicKey = await importSPKI(base64PemToString(publicKeyBase64), INTERNAL_AUTH_ALGORITHM)
  const { payload } = await jwtVerify<AssertionPayload>(token, publicKey, {
    algorithms: [INTERNAL_AUTH_ALGORITHM],
    issuer: INTERNAL_AUTH_ISSUER,
    audience,
    ...(now === undefined ? {} : { currentDate: new Date(now * 1000) }),
  })

  if (
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    !(typeof payload.aud === 'string' || (Array.isArray(payload.aud) && payload.aud.every((value) => typeof value === 'string'))) ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Internal auth assertion claims are invalid')
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid,
    audience: payload.aud,
    issuedAt: payload.iat,
    expiresAt: payload.exp,
  }
}
