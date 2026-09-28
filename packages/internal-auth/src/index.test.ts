import { exportPKCS8, exportSPKI, generateKeyPair, importPKCS8, SignJWT } from 'jose'
import { describe, expect, test } from 'bun:test'

import {
  issueInternalAssertion,
  verifyInternalAssertion,
} from './index'

async function keyEnvironment() {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
  const [privatePem, publicPem] = await Promise.all([exportPKCS8(privateKey), exportSPKI(publicKey)])

  return {
    privateKeyBase64: btoa(privatePem),
    publicKeyBase64: btoa(publicPem),
  }
}

describe('internal auth assertions', () => {
  test('issues and verifies a service-scoped assertion', async () => {
    const keys = await keyEnvironment()
    const token = await issueInternalAssertion({
      ...keys,
      userId: 'user-1',
      sessionId: 'session-1',
      email: 'owner@example.com',
      audience: 'business-service',
      now: 1_000,
    })

    await expect(
      verifyInternalAssertion({
        token,
        publicKeyBase64: keys.publicKeyBase64,
        audience: 'business-service',
        now: 1_010,
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
      email: 'owner@example.com',
      audience: 'business-service',
      issuedAt: 1_000,
      expiresAt: 1_060,
    })
  })

  test('rejects a wrong audience, issuer, expiry, and tampering', async () => {
    const keys = await keyEnvironment()
    const token = await issueInternalAssertion({
      ...keys,
      userId: 'user-1',
      sessionId: 'session-1',
      audience: 'business-service',
      now: 1_000,
    })

    await expect(verifyInternalAssertion({ token, publicKeyBase64: keys.publicKeyBase64, audience: 'reports-service' })).rejects.toThrow()
    await expect(verifyInternalAssertion({ token, publicKeyBase64: keys.publicKeyBase64, audience: 'business-service', now: 1_061 })).rejects.toThrow()
    await expect(verifyInternalAssertion({ token: `${token}tampered`, publicKeyBase64: keys.publicKeyBase64, audience: 'business-service' })).rejects.toThrow()

    const privateKey = await importPKCS8(atob(keys.privateKeyBase64), 'RS256')
    const wrongIssuerToken = await new SignJWT({ sid: 'session-1' })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setSubject('user-1')
      .setIssuer('wrong-issuer')
      .setAudience('business-service')
      .setIssuedAt(1_000)
      .setExpirationTime(1_060)
      .sign(privateKey)

    await expect(verifyInternalAssertion({ token: wrongIssuerToken, publicKeyBase64: keys.publicKeyBase64, audience: 'business-service', now: 1_010 })).rejects.toThrow()
  })
})
