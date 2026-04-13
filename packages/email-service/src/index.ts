export { EmailService } from './service.js'
export type {
  EmailOptions,
  EmailResult,
  IEmailProvider,
  EmailServiceConfig,
  EmailContext,
  EmailTemplateOverrides,
  SupportedLocale,
  RenderedEmail,
} from './types.js'
export { ResendProvider, ConsoleProvider } from './providers/index.js'
export * from './templates/index.js'
