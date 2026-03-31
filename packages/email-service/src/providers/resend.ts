import { Resend } from 'resend'
import type { IEmailProvider, EmailOptions, EmailResult } from '../types.js'

export class ResendProvider implements IEmailProvider {
  name = 'resend'
  private client: Resend

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('Resend API key is required')
    this.client = new Resend(apiKey)
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const base = {
      from: options.from || 'noreply@ezstart.xyz',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      tags: options.tags
        ? Object.entries(options.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    }

    // Resend SDK requires either html or text to be defined (discriminated union)
    const payload = options.html
      ? { ...base, html: options.html, text: options.text }
      : { ...base, text: options.text || '' }

    const { data, error } = await this.client.emails.send(payload)

    if (error) {
      throw new Error(`Resend error: ${error.message}`)
    }

    return { id: data?.id || 'unknown', success: true }
  }
}
