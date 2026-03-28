// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for Gacha Analyzer API
const sentry = initSentry('Gacha Analyzer API')

export { Sentry, sentry }
