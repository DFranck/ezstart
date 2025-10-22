// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger'

// Initialize Sentry for Tower Defense API
const sentry = initSentry('Tower Defense API')

export { Sentry, sentry }
