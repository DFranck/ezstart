import { describe, it, expect } from 'vitest'
import { globToRegex } from '../../routes/e2e-tests/needsRerun.js'

describe('globToRegex', () => {
  it('matches single-segment * within a path', () => {
    const rx = globToRegex('apps/*/api/src/index.ts')
    expect(rx.test('apps/ezauth/api/src/index.ts')).toBe(true)
    expect(rx.test('apps/ezauth/web/src/index.ts')).toBe(false)
  })

  it('matches ** across multiple path segments', () => {
    const rx = globToRegex('apps/ezauth/web/src/app/**/login/page.tsx')
    expect(rx.test('apps/ezauth/web/src/app/[locale]/login/page.tsx')).toBe(true)
    expect(rx.test('apps/ezauth/web/src/app/login/page.tsx')).toBe(true)
  })

  it('returns false on a non-matching path', () => {
    const rx = globToRegex('apps/ezauth/api/**')
    expect(rx.test('apps/ezpay/api/src/index.ts')).toBe(false)
  })

  it('escapes special regex characters in the literal portions', () => {
    const rx = globToRegex('apps/ezauth/web/src/app/[locale]/login/**')
    expect(rx.test('apps/ezauth/web/src/app/[locale]/login/page.tsx')).toBe(true)
    expect(rx.test('apps/ezauth/web/src/app/xlocalex/login/page.tsx')).toBe(false)
  })

  it('matches packages globs used by SDK seed', () => {
    const rx = globToRegex('packages/auth-sdk/src/**')
    expect(rx.test('packages/auth-sdk/src/core/auth-client.ts')).toBe(true)
    expect(rx.test('packages/pay-sdk/src/index.ts')).toBe(false)
  })
})
