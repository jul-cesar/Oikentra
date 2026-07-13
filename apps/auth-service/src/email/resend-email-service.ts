import { Resend } from 'resend'

import { config } from '../config/config'

const resend = new Resend(config.resendApiKey)

export async function sendAuthEmail({
  html,
  subject,
  to,
}: {
  html: string
  subject: string
  to: string
}) {
  const { data, error } = await resend.emails.send({
    from: config.authEmailFrom,
    to: [to],
    subject,
    html,
  })

  if (error) {
    throw new Error(`Failed to send auth email: ${error.message}`)
  }

  if (!data) {
    throw new Error('Failed to send auth email: Resend returned no message data')
  }
}
