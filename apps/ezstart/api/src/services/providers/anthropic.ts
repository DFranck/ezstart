/**
 * Anthropic (Claude API) provider client.
 *
 * Anthropic's public API does not expose a stable usage/quota endpoint for
 * individual API keys. The Admin API endpoint
 * `/v1/organizations/usage_report/messages` requires an Admin API key which
 * most integrations do not have. We attempt it opportunistically and fall
 * back to an "unknown" status with a dashboard link otherwise.
 *
 * Docs: https://docs.anthropic.com/en/api/
 * Auth: x-api-key + anthropic-version header.
 */

import { logger } from '@ezstart/logger/server'
import type { ProviderStatus, UsageMetric } from './types.js'

const ANTHROPIC_API = 'https://api.anthropic.com'
const DASHBOARD_URL = 'https://console.anthropic.com/'
const API_VERSION = '2023-06-01'

interface AnthropicUsageReport {
  data?: Array<{
    uncached_input_tokens?: number
    cached_input_tokens?: number
    output_tokens?: number
    message_count?: number
  }>
}

export async function fetchStatus(): Promise<ProviderStatus> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  const base: ProviderStatus = {
    provider: 'anthropic',
    displayName: 'Anthropic',
    plan: 'Pay-as-you-go',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: DASHBOARD_URL,
  }

  if (!apiKey) {
    return { ...base, error: 'Missing ANTHROPIC_API_KEY env var' }
  }

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': API_VERSION,
  }

  try {
    // Attempt Admin API usage report (requires Admin API key). Graceful fallback.
    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)
    const startingAt = startOfMonth.toISOString()

    const url = `${ANTHROPIC_API}/v1/organizations/usage_report/messages?starting_at=${encodeURIComponent(startingAt)}`
    const res = await fetch(url, { headers })

    if (!res.ok) {
      // 401/403/404 → Admin API not available with this key. This is expected
      // for regular API keys, so we surface an informative unknown status.
      logger.info('[providers/anthropic] usage_report unavailable', {
        status: res.status,
      })
      return {
        ...base,
        statusMessage: 'Usage not available via API — check console.anthropic.com',
      }
    }

    const json = (await res.json()) as AnthropicUsageReport
    let messages = 0
    let inputTokens = 0
    let outputTokens = 0
    for (const entry of json.data ?? []) {
      messages += entry.message_count ?? 0
      inputTokens += (entry.uncached_input_tokens ?? 0) + (entry.cached_input_tokens ?? 0)
      outputTokens += entry.output_tokens ?? 0
    }

    const usage: UsageMetric[] = [
      { label: 'Messages this month', current: messages, limit: null, unit: 'messages' },
      { label: 'Input tokens', current: inputTokens, limit: null, unit: 'tokens' },
      { label: 'Output tokens', current: outputTokens, limit: null, unit: 'tokens' },
    ]

    return {
      ...base,
      usage,
      status: 'healthy',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown Anthropic error'
    logger.warn('[providers/anthropic] fetch failed', { err: msg })
    return {
      ...base,
      statusMessage: 'Usage not available via API — check console.anthropic.com',
      error: msg,
    }
  }
}
