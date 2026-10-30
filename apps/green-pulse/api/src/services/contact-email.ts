import { ConsoleProvider, EmailService, ResendProvider } from '@ezstart/email-service'
import { logger } from '@ezstart/logger/server'

export const CONTACT_TOPICS = [
  'discuss',
  'white-label',
  'integrations',
  'pro',
  'general',
  'careers',
] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export interface ContactMessage {
  topic: ContactTopic
  company: string
  email: string
  message: string
  locale?: string
}

const TOPIC_LABELS: Record<ContactTopic, string> = {
  discuss: 'Discuss challenges',
  'white-label': 'White-label + License',
  integrations: 'Ecosystem integrations',
  pro: 'PRO plan',
  general: 'General',
  careers: 'Careers application',
}

// The recipient stays server-side: it is never exposed to the browser.
const DEFAULT_CONTACT_RECIPIENT = 'aseradni@nexora-venture.com'

let service: EmailService | null = null

function getEmailService(): EmailService {
  if (service) return service
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn('[Contact] No RESEND_API_KEY - using ConsoleProvider (emails logged, not sent)')
  }
  service = new EmailService({
    defaultFrom: 'GreenPulse.AI <noreply@ezstart.xyz>',
    provider: apiKey ? new ResendProvider(apiKey) : new ConsoleProvider(),
  })
  return service
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Forward a website contact request to the internal inbox. Reply goes to the visitor. */
export async function sendContactEmail(input: ContactMessage): Promise<void> {
  const to = process.env.CONTACT_TO_EMAIL || DEFAULT_CONTACT_RECIPIENT
  const label = TOPIC_LABELS[input.topic]
  const locale = input.locale ?? 'en'

  const text = [
    `Topic: ${label}`,
    `Company: ${input.company}`,
    `Email: ${input.email}`,
    `Locale: ${locale}`,
    '',
    input.message,
  ].join('\n')

  const html = `
    <p><strong>Topic:</strong> ${escapeHtml(label)}</p>
    <p><strong>Company:</strong> ${escapeHtml(input.company)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Locale:</strong> ${escapeHtml(locale)}</p>
    <p style="white-space: pre-wrap;">${escapeHtml(input.message)}</p>
  `

  await getEmailService().send({
    to,
    subject: `[GreenPulse.AI] Contact request: ${label}`,
    text,
    html,
    replyTo: input.email,
    tags: { source: 'green-pulse-contact', topic: input.topic },
  })
}
