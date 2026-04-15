import { describe, it, expect } from 'vitest'
import { VAR_TARGETS, resolveTargetApps } from '../secrets-targets.js'
import type { AppName } from '../urls.js'

describe('@ezstart/config - secrets-targets', () => {
  describe('VAR_TARGETS shape', () => {
    it('JWT_SECRET is API-layer and targets every app', () => {
      expect(VAR_TARGETS.JWT_SECRET.layer).toBe('api')
      expect(VAR_TARGETS.JWT_SECRET.apps).toBe('*')
    })

    it('MONGO_URL is templated and has fengshui in webOverrides', () => {
      expect(VAR_TARGETS.MONGO_URL.template).toBe(true)
      expect(VAR_TARGETS.MONGO_URL.webOverrides).toBeDefined()
      expect(VAR_TARGETS.MONGO_URL.webOverrides).toContain('fengshui')
    })

    it('SENTRY_DSN is suffixed', () => {
      expect(VAR_TARGETS.SENTRY_DSN.suffixed).toBe(true)
      expect(VAR_TARGETS.SENTRY_DSN.layer).toBe('api')
    })

    it('NEXT_PUBLIC_* vars are marked as client-exposed', () => {
      expect(VAR_TARGETS.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.client).toBe(true)
      expect(VAR_TARGETS.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.layer).toBe('web')
    })

    it('STRIPE_SECRET_KEY is scoped to ezpay', () => {
      expect(VAR_TARGETS.STRIPE_SECRET_KEY.apps).toEqual(['ezpay'])
      expect(VAR_TARGETS.STRIPE_SECRET_KEY.layer).toBe('api')
    })

    it('SENTRY_AUTH_TOKEN is layer "both" (API + web for source maps upload)', () => {
      expect(VAR_TARGETS.SENTRY_AUTH_TOKEN.layer).toBe('both')
    })
  })

  describe('resolveTargetApps', () => {
    const apps: AppName[] = ['ezauth', 'ezbill']

    it('returns the full app list for "*" + api layer match', () => {
      expect(resolveTargetApps('JWT_SECRET', apps, { layer: 'api' })).toEqual(apps)
    })

    it('returns [] for api-only var when asking for web layer', () => {
      expect(resolveTargetApps('JWT_SECRET', ['ezauth'], { layer: 'web' })).toEqual([])
    })

    it('applies webOverrides for MONGO_URL / web layer', () => {
      expect(
        resolveTargetApps('MONGO_URL', ['fengshui', 'ezbill'], {
          layer: 'web',
          withWebOverrides: true,
        })
      ).toEqual(['fengshui'])
    })

    it('ignores non-target apps when the var scopes explicitly', () => {
      expect(resolveTargetApps('STRIPE_SECRET_KEY', ['ezpay', 'ezauth'], { layer: 'api' })).toEqual(
        ['ezpay']
      )
    })

    it('layer="both" matches regardless of queried layer', () => {
      const all: AppName[] = ['ezauth', 'ezbill', 'ezpay']
      expect(resolveTargetApps('SENTRY_AUTH_TOKEN', all, { layer: 'api' })).toEqual(all)
      expect(resolveTargetApps('SENTRY_AUTH_TOKEN', all, { layer: 'web' })).toEqual(all)
    })

    it('client NEXT_PUBLIC_* returns its scoped apps on web layer', () => {
      expect(
        resolveTargetApps('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', ['ezpay', 'ezauth'], {
          layer: 'web',
        })
      ).toEqual(['ezpay'])
    })

    it('does not apply webOverrides when flag is off', () => {
      expect(resolveTargetApps('MONGO_URL', ['fengshui', 'ezbill'], { layer: 'web' })).toEqual([])
    })
  })
})
