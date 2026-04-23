import { describe, it, expect } from 'vitest'
import { hasFeature } from '../../server/features.js'

describe('hasFeature (server)', () => {
  describe('priority 1 — platform-owned app', () => {
    it('returns true when app.isPlatformOwned=true, regardless of user or plan', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: true },
          appSlug: 'ezstart',
          feature: 'custom-theme',
        })
      ).toBe(true)
    })

    it('returns true when platform-owned, even for anonymous caller with no plan', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: true, plan: null },
          user: null,
          appSlug: 'ezauth',
          feature: 'extended-monitoring',
        })
      ).toBe(true)
    })

    it('does NOT treat `isPlatformOwned=false` as platform-owned', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false },
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })
  })

  describe('priority 2 — superadmin', () => {
    it('returns true when user has `superadmin` in globalRoles', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false },
          user: { globalRoles: ['superadmin'] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(true)
    })

    it('does NOT treat app-scoped `superadmin` role as a bypass', () => {
      // superadmin MUST be global — app-scoped ones are local admins only.
      expect(
        hasFeature({
          app: { isPlatformOwned: false },
          user: { globalRoles: [], appRoles: { acme: ['superadmin'] } },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })
  })

  describe("priority 3 — app's plan grants the feature", () => {
    it('returns true when plan.grantsFeatures contains the feature', () => {
      expect(
        hasFeature({
          app: {
            isPlatformOwned: false,
            plan: { grantsFeatures: ['custom-theme', 'api-access'] },
          },
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(true)
    })

    it('returns false when plan exists but does not grant the feature', () => {
      expect(
        hasFeature({
          app: {
            isPlatformOwned: false,
            plan: { grantsFeatures: ['api-access'] },
          },
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })

    it('handles null plan gracefully (no crash, fall through)', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false, plan: null },
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })
  })

  describe('priority 4 — user has `pro` role for this app', () => {
    it('returns true when user.appRoles[appSlug] includes `pro`', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false, plan: { grantsFeatures: [] } },
          user: { globalRoles: [], appRoles: { acme: ['pro'] } },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(true)
    })

    it('scopes the `pro` role to the matching app only — cross-app `pro` is NOT a grant', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false, plan: { grantsFeatures: [] } },
          user: { globalRoles: [], appRoles: { other: ['pro'] } },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })
  })

  describe('priority 5 — default deny', () => {
    it('returns false when no rule applies', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false, plan: { grantsFeatures: [] } },
          user: { globalRoles: [], appRoles: {} },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })

    it('returns false for anonymous caller on non-platform-owned app', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })

    it('returns false when app is undefined', () => {
      expect(
        hasFeature({
          app: undefined,
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })

    it('returns false when app is null', () => {
      expect(
        hasFeature({
          app: null,
          user: { globalRoles: [] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(false)
    })
  })

  describe('priority ordering — platform-owned wins over all other signals', () => {
    it('platform-owned + non-superadmin user + empty plan still returns true', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: true, plan: { grantsFeatures: [] } },
          user: { globalRoles: ['user'], appRoles: {} },
          appSlug: 'ezauth',
          feature: 'anything-paid',
        })
      ).toBe(true)
    })

    it('superadmin wins even when plan denies feature and user has no `pro` role', () => {
      expect(
        hasFeature({
          app: { isPlatformOwned: false, plan: { grantsFeatures: [] } },
          user: { globalRoles: ['superadmin'] },
          appSlug: 'acme',
          feature: 'custom-theme',
        })
      ).toBe(true)
    })
  })
})
