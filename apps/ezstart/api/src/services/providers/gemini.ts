/**
 * Google Gemini (AI Studio) provider client.
 *
 * Google AI Studio does not expose a public API to read quota usage.
 * Quota consumption is only visible through the Google Cloud Console or
 * AI Studio dashboard. We surface a minimal "unknown" status with a link
 * to the dashboard so the operator can check manually.
 *
 * Docs: https://ai.google.dev/gemini-api/docs
 * Auth: GEMINI_API_KEY (presence check only — no fetch performed).
 */

import type { ProviderStatus } from './types.js'

const DASHBOARD_URL = 'https://aistudio.google.com/'

export async function fetchStatus(): Promise<ProviderStatus> {
  const apiKey = process.env.GEMINI_API_KEY

  const base: ProviderStatus = {
    provider: 'gemini',
    displayName: 'Google Gemini',
    plan: 'Free tier',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!apiKey) {
    return { ...base, error: 'Missing GEMINI_API_KEY env var' }
  }

  return {
    ...base,
    statusMessage: 'Quota check not available via public API — see Google Cloud Console',
  }
}
