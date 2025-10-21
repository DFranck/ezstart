// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger'

// Initialize Sentry for EZPay API
const sentry = initSentry('EZPay API')

export { Sentry, sentry }
