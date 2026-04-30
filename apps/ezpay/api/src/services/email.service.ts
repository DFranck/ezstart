/**
 * EZPay email service singleton.
 *
 * Mirrors the ezauth pattern (`apps/ezauth/api/src/services/email.service.ts`).
 * Falls back to `ConsoleProvider` (logs only, no real send) when
 * `RESEND_API_KEY` is not set — keeps dev / staging unblocked while ensuring
 * production fails loud if the env var is missing (handled at boot).
 */
import { EmailService, ResendProvider, ConsoleProvider } from '@ezstart/email-service'
import { logger } from '@ezstart/logger/server'

const apiKey = process.env.RESEND_API_KEY
const from = 'EZPay <noreply@ezstart.xyz>'

const provider = apiKey ? new ResendProvider(apiKey) : new ConsoleProvider()

if (!apiKey) {
  logger.warn('[Email] No RESEND_API_KEY — using ConsoleProvider (emails logged, not sent)')
}

export const emailService = new EmailService({ defaultFrom: from, provider })
