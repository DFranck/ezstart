// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger'

// Initialize Sentry for Monitoring API
const sentry = initSentry('Monitoring API')

export { Sentry, sentry }
