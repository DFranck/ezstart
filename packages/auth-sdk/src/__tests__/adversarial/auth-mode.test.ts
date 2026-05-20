import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

    beforeEach(() => {
      // Phase D : the SDK ships env-aware default URLs. Force tests into
      // 'production' so `getEzauthDefaultUrls()` returns canonical prod
      // hosts, regardless of the developer machine's DEPLOY_ENV (which
      // would otherwise leak into assertions when this test runs from a
      // staging working tree).
      vi.stubEnv('DEPLOY_ENV', '')
      vi.stubEnv('VERCEL_ENV', '')
      vi.stubEnv('VERCEL_GIT_COMMIT_REF', '')
      vi.stubEnv('NODE_ENV', 'production')
    })

    afterEach(() => {
      vi.unstubAllEnvs()
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
     *
     * The default hostname intentionally avoids the `'staging'` prefix and the
     * `'-git-staging-*.vercel.app'` pattern so `detectAuthEnvironment()` falls
     * through to the production default. Tests that need staging detection
     * should pass `'something-git-staging-x.vercel.app'` explicitly.
     */
    function stubNonLocalhost(hostname = 'app.example.com'): void {
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

    it('falls back to env-aware default API URL off-localhost with empty config (no key, no apiUrl, no firstParty)', () => {
      // Phase D (2026-05-05) — the SDK ships env-aware default URLs for the
      // canonical EZStart deployment, so a bare `resolveSDKConfig({})` no
      // longer throws : it picks the production default URL. Self-hosted
      // callers still override via the `apiUrl` prop or env var.
      stubNonLocalhost()
      const result = resolveSDKConfig({})
      expect(result.clientConfig.apiUrl).toBe('https://ezauth-api.ezstart.xyz/api/auth')
      expect(result.webUrl).toBe('https://ezauth.ezstart.xyz')
    })

    it('falls back to env-aware default with only appName (no URL signals)', () => {
      stubNonLocalhost()
      const result = resolveSDKConfig({ appName: 'myapp' })
      expect(result.clientConfig.apiUrl).toBe('https://ezauth-api.ezstart.xyz/api/auth')
      expect(result.clientConfig.appName).toBe('myapp')
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

    it('uses env-aware default API URL when publishableKey provided off-localhost without apiUrl', () => {
      // Phase D — auto-resolve the canonical EZStart API URL so consumers
      // pointing at the official cloud need ZERO env vars (just the key).
      stubNonLocalhost()
      const result = resolveSDKConfig({
        publishableKey: 'ez_pk_live_abc123',
      })
      expect(result.keyFetch?.apiBaseUrl).toBe('https://ezauth-api.ezstart.xyz')
      expect(result.clientConfig.apiKey).toBe('ez_pk_live_abc123')
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
      it('falls back to DEFAULT_AUTH_WEB_URL off-localhost when no env var is wired', () => {
        stubNonLocalhost()
        // firstParty + apiUrl satisfies the api guard; webUrl falls back to
        // DEFAULT_AUTH_WEB_URL (Stripe-style hardcoded prod default) so a
        // static Vercel build with no `NEXT_PUBLIC_EZAUTH_WEB_URL` env override
        // doesn't trip the localhost trap at prerender time. The guard still
        // catches EXPLICIT localhost values (covered in the next two tests).
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'https://auth.example.com',
          appName: 'ezauth',
        })
        expect(result.webUrl).toBe('https://ezauth.ezstart.xyz')
      })

      it('warns (no throw) off-localhost when webUrl is explicitly set to a localhost URL', () => {
        // Phase D follow-up (2026-05-05) — converted from throw to warn so a
        // false-positive doesn't kill the entire app render.
        //
        // Lot 3B (2026-05-20) — the warning now routes through the INJECTED
        // logger (silent no-op by default) instead of a direct console.warn,
        // so the agnostic core never touches `console`. We assert the logger
        // shim receives the message AND that `console.warn` is never called.
        stubNonLocalhost()
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const warn = vi.fn()
        const result = resolveSDKConfig(
          {
            firstParty: true,
            apiUrl: 'https://auth.example.com',
            appName: 'ezauth',
            webUrl: 'http://localhost:6111',
          },
          { warn }
        )
        expect(result.webUrl).toBe('http://localhost:6111')
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('webUrl resolves to localhost'))
        expect(consoleSpy).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
      })

      it('stays silent (no console write) off-localhost when no logger is injected', () => {
        // Agnostic-core guarantee: with no logger, the localhost-trap guard is
        // a silent no-op — it must NEVER fall back to console.warn.
        stubNonLocalhost()
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const result = resolveSDKConfig({
          firstParty: true,
          apiUrl: 'https://auth.example.com',
          appName: 'ezauth',
          webUrl: 'http://localhost:6111',
        })
        expect(result.webUrl).toBe('http://localhost:6111')
        expect(consoleSpy).not.toHaveBeenCalled()
        consoleSpy.mockRestore()
      })

      it('warns (no throw) off-localhost for 127.0.0.1 / [::1] variants', () => {
        stubNonLocalhost()
        const warn = vi.fn()
        const result = resolveSDKConfig(
          {
            firstParty: true,
            apiUrl: 'https://auth.example.com',
            appName: 'ezauth',
            webUrl: 'http://127.0.0.1:6111',
          },
          { warn }
        )
        expect(result.webUrl).toBe('http://127.0.0.1:6111')
        expect(warn).toHaveBeenCalled()
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

      it('warns (no throw) for dev-mode config with stale webUrl off-localhost', () => {
        stubNonLocalhost()
        // Dev mode (no firstParty, no key) — webUrl localhost surfaces a warn
        // via the injected logger instead of throwing (cf. Phase D follow-up
        // + Lot 3B logger routing).
        const warn = vi.fn()
        const result = resolveSDKConfig(
          {
            apiUrl: 'https://auth.example.com',
            appName: 'myapp',
            webUrl: 'http://localhost:6111',
          },
          { warn }
        )
        expect(result.webUrl).toBe('http://localhost:6111')
        expect(warn).toHaveBeenCalled()
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

      it('falls back to env-aware default at SSR when no apiUrl/key/firstParty provided', () => {
        // Phase D (2026-05-05) — SSR with no window + no env signal +
        // empty config → SDK uses the canonical EZStart production URL
        // as the env-aware default (NODE_ENV=production stub above
        // narrows detectAuthEnvironment to 'production').
        removeWindow()
        const result = resolveSDKConfig({})
        expect(result.clientConfig.apiUrl).toBe('https://ezauth-api.ezstart.xyz/api/auth')
        expect(result.webUrl).toBe('https://ezauth.ezstart.xyz')
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
