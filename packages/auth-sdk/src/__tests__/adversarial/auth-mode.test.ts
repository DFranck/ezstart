import { describe, it, expect } from 'vitest'
import { resolveSDKConfig } from '../../core/auth-client.js'

describe('resolveSDKConfig', () => {
  it('resolves first-party mode with defaults', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      appName: 'ezauth',
    })

    expect(result.clientConfig.appName).toBe('ezauth')
    expect(result.clientConfig.apiUrl).toContain('/api/auth')
    expect(result.configPromise).toBeNull()
  })

  it('resolves first-party mode with custom apiUrl', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      appName: 'ezauth',
      apiUrl: 'https://custom-api.example.com',
    })

    expect(result.clientConfig.apiUrl).toBe('https://custom-api.example.com/api/auth')
    expect(result.configPromise).toBeNull()
  })

  it('resolves dev mode when no key and no firstParty', () => {
    const result = resolveSDKConfig({})

    expect(result.clientConfig.appName).toBe('dev')
    expect(result.clientConfig.apiUrl).toContain('/api/auth')
    expect(result.configPromise).toBeNull()
  })

  it('resolves dev mode with custom appName', () => {
    const result = resolveSDKConfig({ appName: 'myapp' })

    expect(result.clientConfig.appName).toBe('myapp')
    expect(result.configPromise).toBeNull()
  })

  it('returns configPromise when publishableKey is provided', async () => {
    const result = resolveSDKConfig({
      publishableKey: 'ezk_test_abc123',
    })

    // Client created with pending appName
    expect(result.clientConfig.appName).toBe('pending')
    expect(result.clientConfig.apiKey).toBe('ezk_test_abc123')
    // Config promise is set (will fail in test env since no real API)
    expect(result.configPromise).not.toBeNull()
    expect(result.configPromise).toBeInstanceOf(Promise)

    // Catch the expected rejection (no real API in test env)
    await expect(result.configPromise).rejects.toThrow()
  })

  it('uses custom apiUrl with publishableKey', async () => {
    const result = resolveSDKConfig({
      publishableKey: 'ezk_test_abc123',
      apiUrl: 'https://my-auth.example.com',
    })

    expect(result.clientConfig.apiUrl).toBe('https://my-auth.example.com/api/auth')

    // Catch the expected rejection (no real API in test env)
    await result.configPromise?.catch(() => {})
  })

  it('uses custom webUrl when provided', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      webUrl: 'https://auth.mydomain.com',
    })

    expect(result.webUrl).toBe('https://auth.mydomain.com')
  })
})
