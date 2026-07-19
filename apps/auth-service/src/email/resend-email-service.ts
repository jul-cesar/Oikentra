import { Resend } from 'resend'

import { getConfig } from '../config/config'

let resend: Resend | undefined

export async function sendAuthEmail({
  html,
  subject,
  to,
}: {
  html: string
  subject: string
  to: string
}) {
  const config = getConfig()
  resend ??= new Resend(config.resendApiKey)
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
