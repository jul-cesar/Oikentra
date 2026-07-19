import { sendAuthEmail } from './resend-email-service'
import { config } from '../config/config'
import { db } from '../db/client'
import { account } from '../db/schema'
import { and, eq, isNotNull } from 'drizzle-orm'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function actionEmailHtml({
  actionLabel,
  description,
  url,
}: {
  actionLabel: string
  description: string
  url: string
}) {
  const safeUrl = escapeHtml(url)

  return `
    <p>${escapeHtml(description)}</p>
    <p><a href="${safeUrl}">${escapeHtml(actionLabel)}</a></p>
    <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
    <p><a href="${safeUrl}">${safeUrl}</a></p>
    <p>Si no solicitaste esto, puedes ignorar este correo.</p>
  `
}

export function sendVerificationEmail({
  to,
  token,
}: {
  to: string
  token: string
}) {
  const verificationUrl = new URL('/verificar-correo', config.webUrl)
  verificationUrl.hash = new URLSearchParams({ token }).toString()

  return sendAuthEmail({
    to,
    subject: 'Confirma tu correo de Oikentra',
    html: actionEmailHtml({
      actionLabel: 'Confirmar correo',
      description: 'Confirma tu correo para terminar de crear tu cuenta de Oikentra.',
      url: verificationUrl.toString(),
    }),
  })
}

type PasswordResetEmailOutcome =
  | { status: 'accepted' }
  | { status: 'provider_only' }
  | { status: 'delivery_failed'; error: unknown }

function logAuthEvent({
  requestId,
  category,
  outcome,
  error,
}: {
  requestId: string
  category: string
  outcome: string
  error?: unknown
}) {
  console.log(
    JSON.stringify({
      requestId,
      category,
      outcome,
      ...(error
        ? {
            error:
              error instanceof Error ? error.message : 'unknown',
          }
        : {}),
    }),
  )
}

export async function sendPasswordResetEmail({
  to,
  userId,
  token,
  url,
  requestId,
}: {
  to: string
  userId: string
  token: string
  url: string
  requestId: string
}): Promise<PasswordResetEmailOutcome> {
  const credentialAccounts = await db.query.account.findMany({
    where: and(
      eq(account.userId, userId),
      eq(account.providerId, 'credential'),
      isNotNull(account.password),
    ),
    columns: { id: true },
    limit: 1,
  })

  if (credentialAccounts.length === 0) {
    logAuthEvent({
      requestId,
      category: 'password_reset_email',
      outcome: 'provider_only',
    })
    return { status: 'provider_only' }
  }

  const generatedResetUrl = new URL(url)
  const callbackURL = generatedResetUrl.searchParams.get('callbackURL')
  const resetUrl = callbackURL
    ? new URL(callbackURL)
    : new URL('/restablecer-contrasena', config.webUrl)

  if (resetUrl.protocol === 'oikentra:') {
    resetUrl.searchParams.set('token', token)
  } else {
    resetUrl.hash = new URLSearchParams({ token }).toString()
  }

  try {
    await sendAuthEmail({
      to,
      subject: 'Restablece tu contraseña de Oikentra',
      html: actionEmailHtml({
        actionLabel: 'Restablecer contraseña',
        description:
          'Usa este enlace seguro para restablecer tu contraseña de Oikentra.',
        url: resetUrl.toString(),
      }),
    })

    logAuthEvent({
      requestId,
      category: 'password_reset_email',
      outcome: 'accepted',
    })

    return { status: 'accepted' }
  } catch (error) {
    logAuthEvent({
      requestId,
      category: 'password_reset_email',
      outcome: 'delivery_failed',
      error,
    })

    return { status: 'delivery_failed', error }
  }
}
