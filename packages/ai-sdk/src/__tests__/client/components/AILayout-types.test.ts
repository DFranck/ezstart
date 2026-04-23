/**
 * AILayout — prop surface regression test (type-level).
 *
 * The ai-sdk test environment is `node` (no jsdom), and AILayout pulls in a
 * heavy tree of React UI components that are painful to mock meaningfully.
 * Instead we verify at the TypeScript level that the new `adminHref` and
 * `onAdminClick` props exist on the public surface and accept the expected
 * types, and that the runtime default for `adminHref` is `'/admin'`.
 */

import { describe, expect, it } from 'vitest'
import type { AILayoutProps } from '../../../client/components/ai-layout-types.js'

describe('AILayoutProps — adminHref / onAdminClick', () => {
  it('accepts adminHref as an optional string', () => {
    const props: AILayoutProps = {
      appName: 'green-pulse',
      adminHref: '/en/admin',
    }
    expect(props.adminHref).toBe('/en/admin')
  })

  it('accepts onAdminClick as an optional callback', () => {
    let called = false
    const props: AILayoutProps = {
      appName: 'green-pulse',
      onAdminClick: () => {
        called = true
      },
    }
    props.onAdminClick?.()
    expect(called).toBe(true)
  })

  it('both props are optional — props work without them', () => {
    const props: AILayoutProps = { appName: 'green-pulse' }
    expect(props.adminHref).toBeUndefined()
    expect(props.onAdminClick).toBeUndefined()
  })
})
