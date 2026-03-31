import { logger } from '@ezstart/logger'
import type { EmailOptions, EmailResult, EmailServiceConfig, IEmailProvider } from './types.js'

export class EmailService {
  private provider: IEmailProvider
  private defaultFrom: string

  constructor(config: EmailServiceConfig) {
    this.provider = config.provider
    this.defaultFrom = config.defaultFrom
    logger.info(`[EmailService] Initialized with provider: ${this.provider.name}`)
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const emailOptions = {
      ...options,
      from: options.from || this.defaultFrom,
    }

    try {
      const result = await this.provider.send(emailOptions)
      logger.debug(`[EmailService] Email sent via ${this.provider.name}`, {
        to: options.to,
        subject: options.subject,
        id: result.id,
      })
      return result
    } catch (error) {
      logger.error(
        `[EmailService] Failed to send email via ${this.provider.name}:`,
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}
