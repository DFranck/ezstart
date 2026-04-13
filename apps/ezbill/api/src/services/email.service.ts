import { EmailService, ResendProvider, ConsoleProvider } from '@ezstart/email-service'
import { logger } from '@ezstart/logger/server'

const apiKey = process.env.RESEND_API_KEY
const from = 'EZBill <noreply@ezstart.xyz>'

const provider = apiKey ? new ResendProvider(apiKey) : new ConsoleProvider()

if (!apiKey) {
  logger.warn('[Email] No RESEND_API_KEY — using ConsoleProvider (emails logged, not sent)')
}

export const emailService = new EmailService({ defaultFrom: from, provider })
