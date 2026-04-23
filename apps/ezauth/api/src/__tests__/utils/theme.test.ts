/**
 * Unit tests for the theme token validation + serialization utilities.
 *
 * Focus: ensure every accepted color format is round-tripped and every
 * potentially CSS-injecting string is rejected — the output of this module
 * is injected into a `dangerouslySetInnerHTML` <style> block.
 */

import { describe, it, expect } from 'vitest'
import {
  applicationThemeSchema,
  isSafeCssColor,
  isSafeLogoUrl,
  serializeThemeToCssVars,
} from '../../utils/theme.js'

describe('isSafeCssColor', () => {
  it('accepts hex colors (#rgb, #rrggbb, #rrggbbaa)', () => {
    expect(isSafeCssColor('#fff')).toBe(true)
    expect(isSafeCssColor('#00D9F7')).toBe(true)
    expect(isSafeCssColor('#00D9F7FF')).toBe(true)
  })

  it('accepts oklch() with space-separated args', () => {
    expect(isSafeCssColor('oklch(0.7 0.15 210)')).toBe(true)
    expect(isSafeCssColor('oklch(0.7 0.15 210 / 0.5)')).toBe(true)
  })

  it('accepts hsl() and rgb() variants', () => {
    expect(isSafeCssColor('hsl(200 100% 50%)')).toBe(true)
    expect(isSafeCssColor('rgba(0, 217, 247, 0.5)')).toBe(true)
  })

  it('accepts the curated safelist (transparent, currentColor)', () => {
    expect(isSafeCssColor('transparent')).toBe(true)
    expect(isSafeCssColor('currentColor')).toBe(true)
  })

  it('rejects empty / too-long strings', () => {
    expect(isSafeCssColor('')).toBe(false)
    expect(isSafeCssColor('x'.repeat(65))).toBe(false)
  })

  it('rejects CSS injection attempts', () => {
    expect(isSafeCssColor('red;}</style>')).toBe(false)
    expect(isSafeCssColor('red; background: url(evil)')).toBe(false)
    expect(isSafeCssColor('red<script>')).toBe(false)
    expect(isSafeCssColor('{ --bad: 1 }')).toBe(false)
  })

  it('rejects unknown named colors that are not in the safelist', () => {
    // Reasoning: CSS named colors like "red" / "blue" do parse, but since we
    // restrict to a tiny safelist for predictability the check should reject
    // them. If a tenant wants red, they pass `#ff0000` or `rgb(255 0 0)`.
    expect(isSafeCssColor('red')).toBe(false)
    expect(isSafeCssColor('cornflowerblue')).toBe(false)
  })
})

describe('isSafeLogoUrl', () => {
  it('accepts http/https URLs under the length cap', () => {
    expect(isSafeLogoUrl('https://cdn.example.com/logo.svg')).toBe(true)
    expect(isSafeLogoUrl('http://localhost:3000/logo.svg')).toBe(true)
  })

  it('rejects data:, javascript:, file: URIs', () => {
    expect(isSafeLogoUrl('data:image/png;base64,AAA')).toBe(false)
    expect(isSafeLogoUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeLogoUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isSafeLogoUrl('')).toBe(false)
    expect(isSafeLogoUrl('not a url')).toBe(false)
  })
})

describe('applicationThemeSchema', () => {
  it('allows an empty theme object', () => {
    expect(applicationThemeSchema.safeParse({}).success).toBe(true)
  })

  it('allows a partial theme with only primary set', () => {
    const parsed = applicationThemeSchema.safeParse({ primary: '#00D9F7' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.primary).toBe('#00D9F7')
  })

  it('rejects an unknown key (strict)', () => {
    const parsed = applicationThemeSchema.safeParse({ primary: '#fff', bogus: 'x' })
    expect(parsed.success).toBe(false)
  })

  it('rejects an unsafe color value', () => {
    const parsed = applicationThemeSchema.safeParse({ primary: 'red; }</style>' })
    expect(parsed.success).toBe(false)
  })

  it('rejects a non-http logo URL', () => {
    const parsed = applicationThemeSchema.safeParse({ logo: 'javascript:alert(1)' })
    expect(parsed.success).toBe(false)
  })
})

describe('serializeThemeToCssVars', () => {
  it('returns an empty string when theme is nullish or empty', () => {
    expect(serializeThemeToCssVars(null)).toBe('')
    expect(serializeThemeToCssVars(undefined)).toBe('')
    expect(serializeThemeToCssVars({})).toBe('')
  })

  it('emits `--primary:<value>;` for a single token', () => {
    expect(serializeThemeToCssVars({ primary: '#00D9F7' })).toBe('--primary:#00D9F7;')
  })

  it('emits all safe tokens in a stable order', () => {
    const css = serializeThemeToCssVars({
      primary: '#00D9F7',
      background: '#000',
      foreground: '#fff',
      accent: '#ff00ff',
    })
    expect(css).toContain('--primary:#00D9F7;')
    expect(css).toContain('--background:#000;')
    expect(css).toContain('--foreground:#fff;')
    expect(css).toContain('--accent:#ff00ff;')
  })

  it('drops tokens that fail the safety check', () => {
    // `isSafeCssColor` would reject this, but defense in depth lives in
    // `serializeThemeToCssVars` too — the function must never emit a string
    // containing `;`, `{`, `}`, `<` or `>` unless it came from a validated
    // token.
    const css = serializeThemeToCssVars({
      primary: '#00D9F7',
      // Directly cast — simulates a value that bypassed Zod (should not
      // happen in practice, but the serializer is the last line of defense).
      background: 'red;}</style>' as string,
    })
    expect(css).toBe('--primary:#00D9F7;')
  })

  it('does not emit the logo field (not a CSS variable)', () => {
    const css = serializeThemeToCssVars({ logo: 'https://cdn.example.com/logo.svg' })
    expect(css).toBe('')
  })
})
