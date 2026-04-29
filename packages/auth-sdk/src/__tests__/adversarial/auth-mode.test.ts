import { afterEach, describe, expect, it } from 'vitest'
import { resolveSDKConfig } from '../../core/auth-client.js'

describe('resolveSDKConfig', () => {
  it('resolves first-party mode with defaults', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      appName: 'ezauth',
    })

    expect(result.clientConfig.appName).toBe('ezauth')
    expect(result.clientConfig.apiUrl).toContain('/api/auth')
    expect(result.keyFetch).toBeNull()
  })

  it('resolves first-party mode with custom apiUrl', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      appName: 'ezauth',
      apiUrl: 'https://custom-api.example.com',
    })

    expect(result.clientConfig.apiUrl).toBe('https://custom-api.example.com/api/auth')
    expect(result.keyFetch).toBeNull()
  })

  it('resolves dev mode when no key and no firstParty', () => {
    const result = resolveSDKConfig({})

    expect(result.clientConfig.appName).toBe('dev')
    expect(result.clientConfig.apiUrl).toContain('/api/auth')
    expect(result.keyFetch).toBeNull()
  })

  it('resolves dev mode with custom appName', () => {
    const result = resolveSDKConfig({ appName: 'myapp' })

    expect(result.clientConfig.appName).toBe('myapp')
    expect(result.keyFetch).toBeNull()
  })

  it('returns a keyFetch descriptor when publishableKey is provided (no side effect)', () => {
    const result = resolveSDKConfig({
      publishableKey: 'ezk_test_abc123',
    })

    // Client created with pending appName
    expect(result.clientConfig.appName).toBe('pending')
    expect(result.clientConfig.apiKey).toBe('ezk_test_abc123')
    // Key fetch descriptor is set — synchronous, no network yet.
    // This is load-bearing for the infinite-loop guard: `resolveSDKConfig` is
    // pure and safe to call from `useMemo`.
    expect(result.keyFetch).not.toBeNull()
    expect(result.keyFetch?.publishableKey).toBe('ezk_test_abc123')
    expect(typeof result.keyFetch?.apiBaseUrl).toBe('string')
  })

  it('uses custom apiUrl with publishableKey', () => {
    const result = resolveSDKConfig({
      publishableKey: 'ezk_test_abc123',
      apiUrl: 'https://my-auth.example.com',
    })

    expect(result.clientConfig.apiUrl).toBe('https://my-auth.example.com/api/auth')
    expect(result.keyFetch?.apiBaseUrl).toBe('https://my-auth.example.com')
  })

  it('uses custom webUrl when provided', () => {
    const result = resolveSDKConfig({
      firstParty: true,
      webUrl: 'https://auth.mydomain.com',
    })

    expect(result.webUrl).toBe('https://auth.mydomain.com')
  })

  // -------------------------------------------------------------------------
  // Fail-fast behavior off localhost (no hardcoded vendor fallback)
  // -------------------------------------------------------------------------

  describe('off-localhost fail-fast', () => {
    const originalLocation = window.location

    afterEach(() => {
      // Restore the original jsdom location object
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: originalLocation,
      })
    })

    /**
     * Simulate a non-localhost environment by replacing window.location with
     * a plain object whose hostname is non-local. jsdom's native Location
     * property is non-configurable on the descriptor, so we swap the whole
     * object.
     */
    function stubNonLocalhost(hostname = 'staging.example.com'): void {
      Object.defineProperty(window, 'location', {
        configurable: true,
        writable: true,
        value: {
          ...originalLocation,
          hostname,
          origin: `https://${hostname}`,
          host: hostname,
          href: `https://${hostname}/`,
          protocol: 'https:',
          pathname: '/',
        },
      })
    }

    it('throws when called off-localhost with empty config (no key, no apiUrl, no firstParty)', () => {
      stubNonLocalhost()
      expect(() => resolveSDKConfig({})).toThrow(/cannot resolve apiUrl/i)
    })

    it('throws when called off-localhost with only appName (no URL signals)', () => {
      stubNonLocalhost()
      expect(() => resolveSDKConfig({ appName: 'myapp' })).toThrow(/cannot resolve apiUrl/i)
    })

    it('accepts firstParty with explicit apiUrl off-localhost', () => {
      stubNonLocalhost()
      const result = resolveSDKConfig({
        firstParty: true,
        appName: 'myapp',
        apiUrl: 'https://auth.example.com',
        webUrl: 'https://auth.example.com',
      })
      expect(result.clientConfig.apiUrl).toBe('https://auth.example.com/api/auth')
    })

    it('accepts publishableKey with explicit apiUrl off-localhost', () => {
      stubNonLocalhost()
      const result = resolveSDKConfig({
        publishableKey: 'ez_pk_live_abc123',
        apiUrl: 'https://auth.example.com',
        webUrl: 'https://auth.example.com',
      })
      expect(result.clientConfig.apiUrl).toBe('https://auth.example.com/api/auth')
      expect(result.clientConfig.apiKey).toBe('ez_pk_live_abc123')
      expect(result.keyFetch).not.toBeNull()
      expect(result.keyFetch?.publishableKey).toBe('ez_pk_live_abc123')
      expect(result.keyFetch?.apiBaseUrl).toBe('https://auth.example.com')
    })

    it('throws when publishableKey provided off-localhost without apiUrl', () => {
      stubNonLocalhost()
      expect(() =>
        resolveSDKConfig({
          publishableKey: 'ez_pk_live_abc123',
        })
      ).toThrow(/cannot resolve apiUrl/i)
    })

    it('accepts explicit apiUrl off-localhost without a key', () => {
      stubNonLocalhost()
      const result = resolveSDKConfig({
        apiUrl: 'https://auth.example.com',
        appName: 'myapp',
        webUrl: 'https://auth.example.com',
      })
      expect(result.clientConfig.apiUrl).toBe('https://auth.example.com/api/auth')
      expect(result.clientConfig.appName).toBe('myapp')
    })

    // -----------------------------------------------------------------------
    // VULN-A3 — first-party mode must not silently default appName to
    // 'ezauth' off-localhost (cross-tenant leak).
    // -----------------------------------------------------------------------

    describe('first-party appName guard', () => {
      it('throws off-localhost when firstParty + apiUrl but no appName', () => {
        stubNonLocalhost()
        expect(() =>
          resolveSDKConfig({
            firstParty: true,
            apiUrl: 'https://auth.example.com',
          })
        ).toThrow(/first-party mode requires an explicit `appName`/i)
      })

      it('accepts off-localhost when firstParty + apiUrl + explicit appName', () => {
        stubNonLocalhost()
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'https://auth.example.com',
          webUrl: 'https://auth.example.com',
          appName: 'ezpay',
        })
        expect(result.clientConfig.appName).toBe('ezpay')
      })

      it('keeps the localhost default appName permissive for dev DX', () => {
        // No stub: jsdom defaults to localhost.
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'http://localhost:6110',
        })
        expect(result.clientConfig.appName).toBe('ezauth')
      })
    })

    // -----------------------------------------------------------------------
    // VULN-A4 — webUrl must not silently resolve to localhost off-localhost
    // (would break login/register redirects in production).
    // -----------------------------------------------------------------------

    describe('webUrl localhost trap guard', () => {
      it('throws off-localhost when webUrl defaults to localhost (env var missing)', () => {
        stubNonLocalhost()
        // firstParty + apiUrl satisfies the api guard; webUrl falls back to
        // DEFAULT_LOCAL_WEB because no NEXT_PUBLIC_EZAUTH_WEB_URL was wired.
        expect(() =>
          resolveSDKConfig({
            firstParty: true,
            apiUrl: 'https://auth.example.com',
            appName: 'ezauth',
          })
        ).toThrow(/webUrl resolves to localhost/i)
      })

      it('throws off-localhost when webUrl is explicitly set to a localhost URL', () => {
        stubNonLocalhost()
        expect(() =>
          resolveSDKConfig({
            firstParty: true,
            apiUrl: 'https://auth.example.com',
            appName: 'ezauth',
            webUrl: 'http://localhost:6111',
          })
        ).toThrow(/webUrl resolves to localhost/i)
      })

      it('throws off-localhost for 127.0.0.1 / [::1] variants', () => {
        stubNonLocalhost()
        expect(() =>
          resolveSDKConfig({
            firstParty: true,
            apiUrl: 'https://auth.example.com',
            appName: 'ezauth',
            webUrl: 'http://127.0.0.1:6111',
          })
        ).toThrow(/webUrl resolves to localhost/i)
      })

      it('accepts off-localhost when webUrl is a real domain', () => {
        stubNonLocalhost()
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'https://auth.example.com',
          appName: 'ezauth',
          webUrl: 'https://ezauth.example.com',
        })
        expect(result.webUrl).toBe('https://ezauth.example.com')
      })

      it('keeps localhost → localhost redirects permissive for dev DX', () => {
        // No stub: jsdom is on localhost. Default webUrl (localhost:6111) OK.
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'http://localhost:6110',
        })
        expect(result.webUrl).toContain('localhost')
      })

      it('fires the guard for dev-mode config with stale webUrl off-localhost', () => {
        stubNonLocalhost()
        // Dev mode (no firstParty, no key) normally throws before reaching the
        // webUrl guard because apiUrl is missing. Providing apiUrl explicitly
        // should still trip the webUrl guard when webUrl itself is localhost.
        expect(() =>
          resolveSDKConfig({
            apiUrl: 'https://auth.example.com',
            appName: 'myapp',
            webUrl: 'http://localhost:6111',
          })
        ).toThrow(/webUrl resolves to localhost/i)
      })
    })

    // -----------------------------------------------------------------------
    // VULN-A2 — isLocalhost coverage for .localhost TLD, 0.0.0.0, IPv6 loopback.
    // -----------------------------------------------------------------------

    describe('isLocalhost extended coverage', () => {
      it('treats *.localhost TLD as localhost (Chrome multi-tenant dev)', () => {
        stubNonLocalhost('app.localhost')
        // No explicit signals → would throw off-localhost. With the extended
        // isLocalhost, this resolves with permissive dev defaults instead.
        const result = resolveSDKConfig({})
        expect(result.clientConfig.appName).toBe('dev')
        expect(result.clientConfig.apiUrl).toContain('/api/auth')
      })

      it('treats 0.0.0.0 as localhost', () => {
        stubNonLocalhost('0.0.0.0')
        const result = resolveSDKConfig({})
        expect(result.clientConfig.appName).toBe('dev')
      })

      it('treats ::1 (IPv6 loopback) as localhost', () => {
        stubNonLocalhost('::1')
        const result = resolveSDKConfig({})
        expect(result.clientConfig.appName).toBe('dev')
      })

      it('keeps 127.0.0.1 as localhost', () => {
        stubNonLocalhost('127.0.0.1')
        const result = resolveSDKConfig({})
        expect(result.clientConfig.appName).toBe('dev')
      })
    })

    // -----------------------------------------------------------------------
    // VULN-A1 — SSR without apiUrl throws (documented brittleness, acceptable).
    // -----------------------------------------------------------------------

    describe('SSR behavior (no window)', () => {
      let savedWindow: typeof globalThis.window | undefined

      afterEach(() => {
        if (savedWindow !== undefined) {
          Object.defineProperty(globalThis, 'window', {
            configurable: true,
            writable: true,
            value: savedWindow,
          })
          savedWindow = undefined
        }
      })

      function removeWindow(): void {
        savedWindow = globalThis.window
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          writable: true,
          value: undefined,
        })
      }

      it('throws CONFIG_ERROR at SSR when no apiUrl/key/firstParty is provided', () => {
        removeWindow()
        // No window → isLocalhost() returns false → off-localhost fail-fast
        // triggers. This is the documented SSR contract: consumers must pass
        // apiUrl explicitly OR load the provider behind `'use client'`.
        expect(() => resolveSDKConfig({})).toThrow(/cannot resolve apiUrl/i)
      })

      it('resolves at SSR when apiUrl and webUrl are provided explicitly', () => {
        removeWindow()
        const result = resolveSDKConfig({
          apiUrl: 'https://auth.example.com',
          webUrl: 'https://auth.example.com',
          appName: 'myapp',
        })
        expect(result.clientConfig.apiUrl).toBe('https://auth.example.com/api/auth')
      })
    })
  })
})
