import { logger } from '@ezstart/logger'
import type { IEmailProvider, EmailOptions, EmailResult } from '../types.js'

/**
 * Console provider — logs emails instead of sending them.
 * Use in development/testing when no email API key is configured.
 */
export class ConsoleProvider implements IEmailProvider {
  name = 'console'

  async send(options: EmailOptions): Promise<EmailResult> {
    const id = `console_${Date.now()}`
    logger.info(`[ConsoleEmail] Would send email:`, {
      id,
      to: options.to,
      from: options.from,
      subject: options.subject,
      htmlLength: options.html?.length || 0,
      textLength: options.text?.length || 0,
    })
    return { id, success: true }
  }
}
