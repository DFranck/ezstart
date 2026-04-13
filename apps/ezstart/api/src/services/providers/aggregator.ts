/**
 * Aggregator — runs all provider clients in parallel and caches the result.
 *
 * Error isolation: `Promise.allSettled` ensures one failing provider does not
 * break the others. On rejection we synthesize a minimal error DTO.
 */

import { fetchStatus as vercelFetch } from './vercel.js'
import { fetchStatus as railwayFetch } from './railway.js'
import { fetchStatus as mongoFetch } from './mongodb.js'
import { fetchStatus as stripeFetch } from './stripe.js'
import { fetchStatus as resendFetch } from './resend.js'
import { fetchStatus as sentryFetch } from './sentry.js'
import { fetchStatus as anthropicFetch } from './anthropic.js'
import { fetchStatus as openaiFetch } from './openai.js'
import { fetchStatus as geminiFetch } from './gemini.js'
import { fetchStatus as githubFetch } from './github.js'
import type { ProviderName, ProviderStatus, ProviderStatusListResponse } from './types.js'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: ProviderStatus[]
  generatedAt: number
  expires: number
}

let cache: CacheEntry | null = null

interface ProviderDefinition {
  name: ProviderName
  displayName: string
  fetch: () => Promise<ProviderStatus>
  dashboardUrl: string
}

const PROVIDERS: ProviderDefinition[] = [
  {
    name: 'vercel',
    displayName: 'Vercel',
    fetch: vercelFetch,
    dashboardUrl: 'https://vercel.com/dashboard',
  },
  {
    name: 'railway',
    displayName: 'Railway',
    fetch: railwayFetch,
    dashboardUrl: 'https://railway.app/dashboard',
  },
  {
    name: 'mongodb',
    displayName: 'MongoDB Atlas',
    fetch: mongoFetch,
    dashboardUrl: 'https://cloud.mongodb.com/',
  },
  {
    name: 'stripe',
    displayName: 'Stripe',
    fetch: stripeFetch,
    dashboardUrl: 'https://dashboard.stripe.com/',
  },
  {
    name: 'resend',
    displayName: 'Resend',
    fetch: resendFetch,
    dashboardUrl: 'https://resend.com/emails',
  },
  {
    name: 'sentry',
    displayName: 'Sentry',
    fetch: sentryFetch,
    dashboardUrl: 'https://sentry.io/',
  },
  {
    name: 'anthropic',
    displayName: 'Anthropic',
    fetch: anthropicFetch,
    dashboardUrl: 'https://console.anthropic.com/',
  },
  {
    name: 'openai',
    displayName: 'OpenAI',
    fetch: openaiFetch,
    dashboardUrl: 'https://platform.openai.com/usage',
  },
  {
    name: 'gemini',
    displayName: 'Google Gemini',
    fetch: geminiFetch,
    dashboardUrl: 'https://aistudio.google.com/',
  },
  {
    name: 'github',
    displayName: 'GitHub',
    fetch: githubFetch,
    dashboardUrl: 'https://github.com/',
  },
]

function buildErrorStatus(def: ProviderDefinition, reason: unknown): ProviderStatus {
  const msg = reason instanceof Error ? reason.message : String(reason)
  return {
    provider: def.name,
    displayName: def.displayName,
    plan: 'Unknown',
    monthlyCostEstimate: 0,
    usage: [],
    status: 'unknown',
    lastSync: new Date().toISOString(),
    dashboardUrl: def.dashboardUrl,
    error: msg,
  }
}

export async function getAllProviderStatuses(
  opts: { force?: boolean } = {}
): Promise<ProviderStatusListResponse> {
  const now = Date.now()
  if (!opts.force && cache && cache.expires > now) {
    return {
      providers: cache.data,
      cacheTtlSeconds: Math.max(0, Math.round((cache.expires - now) / 1000)),
      generatedAt: new Date(cache.generatedAt).toISOString(),
    }
  }

  const results = await Promise.allSettled(PROVIDERS.map(p => p.fetch()))
  const data: ProviderStatus[] = results.map((r, i) => {
    const def = PROVIDERS[i]!
    return r.status === 'fulfilled' ? r.value : buildErrorStatus(def, r.reason)
  })

  cache = {
    data,
    generatedAt: now,
    expires: now + CACHE_TTL_MS,
  }

  return {
    providers: data,
    cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
    generatedAt: new Date(now).toISOString(),
  }
}

export function clearProviderCache(): void {
  cache = null
}
