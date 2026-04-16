export interface ApiKeyItem {
  id: string
  keyPrefix: string
  name: string
  appName: string
  permissions: string[]
  status: 'active' | 'revoked'
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
  quotaMonthly: number | null
  usageThisMonth: number
}

export interface ApiKeyUsageResponse {
  currentMonth: {
    requestCount: number
    topEndpoints: { endpoint: string; count: number }[]
  }
  daily: { date: string; requestCount: number }[]
  quota: {
    limit: number | null
    used: number
    remaining: number | null
  }
}

export interface CreateApiKeyResponse {
  id: string
  key: string
  keyPrefix: string
  name: string
}
