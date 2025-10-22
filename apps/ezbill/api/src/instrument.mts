// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger'

// Initialize Sentry for EZBill API
const sentry = initSentry('EZBill API')

export { Sentry, sentry }
