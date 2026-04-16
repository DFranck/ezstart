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
}

export interface CreateApiKeyResponse {
  id: string
  key: string
  keyPrefix: string
  name: string
}
