import { sendAuthEmail } from './resend-email-service'

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
    <p>If the button does not work, copy and paste this link into your browser:</p>
    <p><a href="${safeUrl}">${safeUrl}</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `
}

export function sendVerificationEmail({
  to,
  url,
}: {
  to: string
  url: string
}) {
  return sendAuthEmail({
    to,
    subject: 'Verify your Oikentra email address',
    html: actionEmailHtml({
      actionLabel: 'Verify email address',
      description: 'Please verify your email address to finish setting up your Oikentra account.',
      url,
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
    subject: 'Reset your Oikentra password',
    html: actionEmailHtml({
      actionLabel: 'Reset password',
      description: 'Use this secure link to reset your Oikentra password.',
      url,
    }),
  })
}
