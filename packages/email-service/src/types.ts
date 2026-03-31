export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string // Override default sender
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  tags?: Record<string, string>
}

export interface EmailResult {
  id: string
  success: boolean
}

export interface IEmailProvider {
  name: string
  send(options: EmailOptions): Promise<EmailResult>
}

export interface EmailServiceConfig {
  defaultFrom: string // e.g. "EZStart <noreply@ezstart.xyz>"
  provider: IEmailProvider
}
