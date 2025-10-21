// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger'

// Initialize Sentry for EZAuth API
const sentry = initSentry('EZAuth API')

export { Sentry, sentry }
