/**
 * Token storage abstraction.
 *
 * Supports localStorage, memory, or any custom backend implementing
 * the `AuthStorage` interface.
 */

import type { AuthStorage } from './types.js'

// ---------------------------------------------------------------------------
// Built-in storage backends
// ---------------------------------------------------------------------------

/** In-memory storage (no persistence, for SSR / tests). */
export function createMemoryStorage(): AuthStorage {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

/** localStorage wrapper with SSR safety. */
export function createLocalStorage(): AuthStorage {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return createMemoryStorage()
  }
  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  }
}

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------

const ACCESS_TOKEN_SUFFIX = ':access_token'
const REFRESH_TOKEN_SUFFIX = ':refresh_token'
const USER_SUFFIX = ':user'

export class TokenManager {
  private storage: AuthStorage
  private prefix: string

  constructor(storage: AuthStorage, prefix: string = 'ezauth') {
    this.storage = storage
    this.prefix = prefix
  }

  private key(suffix: string): string {
    return `${this.prefix}${suffix}`
  }

  async getAccessToken(): Promise<string | null> {
    const result = this.storage.getItem(this.key(ACCESS_TOKEN_SUFFIX))
    return result instanceof Promise ? result : result
  }

  async setAccessToken(token: string): Promise<void> {
    await this.storage.setItem(this.key(ACCESS_TOKEN_SUFFIX), token)
  }

  async removeAccessToken(): Promise<void> {
    await this.storage.removeItem(this.key(ACCESS_TOKEN_SUFFIX))
  }

  async getRefreshToken(): Promise<string | null> {
    const result = this.storage.getItem(this.key(REFRESH_TOKEN_SUFFIX))
    return result instanceof Promise ? result : result
  }

  async setRefreshToken(token: string): Promise<void> {
    await this.storage.setItem(this.key(REFRESH_TOKEN_SUFFIX), token)
  }

  async removeRefreshToken(): Promise<void> {
    await this.storage.removeItem(this.key(REFRESH_TOKEN_SUFFIX))
  }

  async getUser(): Promise<string | null> {
    const result = this.storage.getItem(this.key(USER_SUFFIX))
    return result instanceof Promise ? result : result
  }

  async setUser(userJson: string): Promise<void> {
    await this.storage.setItem(this.key(USER_SUFFIX), userJson)
  }

  async removeUser(): Promise<void> {
    await this.storage.removeItem(this.key(USER_SUFFIX))
  }

  async clearAll(): Promise<void> {
    await this.removeAccessToken()
    await this.removeRefreshToken()
    await this.removeUser()
  }
}
