// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for GreenPulse API
const sentry = initSentry('GreenPulse API')

export { Sentry, sentry }
