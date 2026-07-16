import { sendAuthEmail } from './resend-email-service'
import { config } from '../config/config'

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

export function sendPasswordResetEmail({
  to,
  url,
}: {
  to: string
  url: string
}) {
  return sendAuthEmail({
    to,
    subject: 'Restablece tu contraseña de Oikentra',
    html: actionEmailHtml({
      actionLabel: 'Restablecer contraseña',
      description: 'Usa este enlace seguro para restablecer tu contraseña de Oikentra.',
      url,
    }),
  })
}
