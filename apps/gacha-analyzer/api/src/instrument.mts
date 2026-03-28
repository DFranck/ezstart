// Centralized Sentry initialization from @ezstart/logger
import { initSentry, Sentry } from '@ezstart/logger/server'

// Initialize Sentry for Game Analyzer API
const sentry = initSentry('Game Analyzer API')

export { Sentry, sentry }
