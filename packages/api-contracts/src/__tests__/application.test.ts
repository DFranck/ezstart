import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  ApplicationResolveResponseSchema,
  ApplicationSchema,
  ApplicationStatusSchema,
  ApplicationThemeSchema,
  CreateApplicationRequestSchema,
  UpdateApplicationRequestSchema,
  UpdateApplicationThemeRequestSchema,
  type Application,
  type ApplicationResolveResponse,
  type ApplicationStatus,
  type ApplicationTheme,
  type CreateApplicationRequest,
  type UpdateApplicationRequest,
  type UpdateApplicationThemeRequest,
} from '../application.js'

describe('ApplicationStatusSchema', () => {
  it('accepts the two lifecycle states', () => {
    expect(ApplicationStatusSchema.parse('active')).toBe('active')
    expect(ApplicationStatusSchema.parse('archived')).toBe('archived')
  })

  it('rejects unknown statuses', () => {
    expect(() => ApplicationStatusSchema.parse('deleted')).toThrow()
    expect(() => ApplicationStatusSchema.parse('pending')).toThrow()
    expect(() => ApplicationStatusSchema.parse('')).toThrow()
    expect(() => ApplicationStatusSchema.parse(null)).toThrow()
  })

  it('exports the type union', () => {
    expectTypeOf<ApplicationStatus>().toEqualTypeOf<'active' | 'archived'>()
  })
})

describe('ApplicationThemeSchema', () => {
  it('accepts an empty theme (all fields optional)', () => {
    expect(ApplicationThemeSchema.parse({})).toEqual({})
  })

  it('accepts every supported token', () => {
    const theme: ApplicationTheme = {
      primary: 'oklch(0.6 0.2 250)',
      background: '#ffffff',
      foreground: '#000000',
      accent: 'hsl(220 100% 60%)',
      logo: 'https://cdn.example.com/logo.png',
    }
    expect(ApplicationThemeSchema.parse(theme)).toEqual(theme)
  })

  it('accepts partial themes', () => {
    expect(ApplicationThemeSchema.parse({ primary: 'red' })).toEqual({ primary: 'red' })
  })

  it('strips unknown fields (default Zod object behaviour)', () => {
    expect(
      ApplicationThemeSchema.parse({ primary: 'red', evil: 'xss' } as Record<string, unknown>)
    ).toEqual({
      primary: 'red',
    })
  })
})

describe('ApplicationSchema', () => {
  const baseValid: Application = {
    id: 'app_abc123',
    slug: 'acme',
    name: 'Acme Corp',
    ownerId: 'user_xyz789',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('accepts the minimal valid shape', () => {
    expect(ApplicationSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('accepts a fully-populated shape', () => {
    const full: Application = {
      ...baseValid,
      description: 'Industrial supplies',
      metadata: { region: 'eu-west-1', tier: 'enterprise' },
      theme: { primary: 'red' },
      themeEnabled: true,
      isPlatformOwned: false,
      requireEmailVerification: true,
      webhookEndpointUrl: 'https://hooks.acme.com/ezauth',
      webhookSecret: 'whsec_abcdef',
    }
    expect(ApplicationSchema.parse(full)).toEqual(full)
  })

  it('accepts theme=null (cleared tokens)', () => {
    expect(ApplicationSchema.parse({ ...baseValid, theme: null })).toMatchObject({ theme: null })
  })

  it('accepts webhookEndpointUrl=null', () => {
    expect(ApplicationSchema.parse({ ...baseValid, webhookEndpointUrl: null })).toMatchObject({
      webhookEndpointUrl: null,
    })
  })

  it('rejects missing required fields', () => {
    expect(() => ApplicationSchema.parse({ ...baseValid, id: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, slug: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, name: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, ownerId: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, status: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, createdAt: undefined })).toThrow()
    expect(() => ApplicationSchema.parse({ ...baseValid, updatedAt: undefined })).toThrow()
  })

  it('rejects invalid status', () => {
    expect(() => ApplicationSchema.parse({ ...baseValid, status: 'deleted' })).toThrow()
  })

  it('preserves wire-shape field names (ownerId, not owner_id)', () => {
    expectTypeOf<Application>().toHaveProperty('ownerId').toEqualTypeOf<string>()
    expectTypeOf<Application>().toHaveProperty('createdAt').toEqualTypeOf<string>()
    expectTypeOf<Application>().toHaveProperty('updatedAt').toEqualTypeOf<string>()
  })

  it('marks themeEnabled / requireEmailVerification as optional', () => {
    expectTypeOf<Application>().toHaveProperty('themeEnabled').toEqualTypeOf<boolean | undefined>()
    expectTypeOf<Application>()
      .toHaveProperty('requireEmailVerification')
      .toEqualTypeOf<boolean | undefined>()
  })

  describe('isTestMode (Stripe-pattern test/live partition)', () => {
    it('accepts isTestMode=true', () => {
      const parsed = ApplicationSchema.safeParse({ ...baseValid, isTestMode: true })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBe(true)
    })

    it('accepts isTestMode=false', () => {
      const parsed = ApplicationSchema.safeParse({ ...baseValid, isTestMode: false })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBe(false)
    })

    it('treats missing isTestMode as undefined (optional, legacy backcompat)', () => {
      const parsed = ApplicationSchema.safeParse(baseValid)
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBeUndefined()
    })

    it('rejects non-boolean isTestMode (no string coercion)', () => {
      const parsed = ApplicationSchema.safeParse({
        ...baseValid,
        isTestMode: 'true' as unknown as boolean,
      })
      expect(parsed.success).toBe(false)
    })

    it('exports isTestMode as boolean | undefined on the type', () => {
      expectTypeOf<Application>().toHaveProperty('isTestMode').toEqualTypeOf<boolean | undefined>()
    })
  })
})

describe('CreateApplicationRequestSchema', () => {
  it('accepts a minimal shape', () => {
    const req: CreateApplicationRequest = { slug: 'acme', name: 'Acme' }
    expect(CreateApplicationRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts optional fields', () => {
    const req: CreateApplicationRequest = {
      slug: 'acme',
      name: 'Acme',
      description: 'desc',
      metadata: { x: 1 },
    }
    expect(CreateApplicationRequestSchema.parse(req)).toEqual(req)
  })

  it('rejects missing slug / name', () => {
    expect(() => CreateApplicationRequestSchema.parse({ name: 'x' })).toThrow()
    expect(() => CreateApplicationRequestSchema.parse({ slug: 'x' })).toThrow()
  })
})

describe('UpdateApplicationRequestSchema', () => {
  it('accepts every field as optional', () => {
    expect(UpdateApplicationRequestSchema.parse({})).toEqual({})
  })

  it('accepts partial updates', () => {
    const req: UpdateApplicationRequest = { name: 'New name' }
    expect(UpdateApplicationRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts requireEmailVerification toggle', () => {
    expect(UpdateApplicationRequestSchema.parse({ requireEmailVerification: true })).toMatchObject({
      requireEmailVerification: true,
    })
  })
})

describe('UpdateApplicationThemeRequestSchema', () => {
  it('accepts toggle-only updates', () => {
    expect(UpdateApplicationThemeRequestSchema.parse({ themeEnabled: false })).toEqual({
      themeEnabled: false,
    })
  })

  it('accepts theme=null (clear tokens)', () => {
    const req: UpdateApplicationThemeRequest = { theme: null }
    expect(UpdateApplicationThemeRequestSchema.parse(req)).toEqual({ theme: null })
  })

  it('accepts theme tokens', () => {
    const req: UpdateApplicationThemeRequest = { theme: { primary: 'red' } }
    expect(UpdateApplicationThemeRequestSchema.parse(req)).toEqual(req)
  })
})

describe('ApplicationResolveResponseSchema', () => {
  it('accepts the minimal shape', () => {
    const res: ApplicationResolveResponse = {
      applicationId: 'app_abc',
      slug: 'acme',
      name: 'Acme',
    }
    expect(ApplicationResolveResponseSchema.parse(res)).toEqual(res)
  })

  it('accepts the typed key metadata', () => {
    const res: ApplicationResolveResponse = {
      applicationId: 'app_abc',
      slug: 'acme',
      name: 'Acme',
      type: 'publishable',
      env: 'live',
      scope: 'user',
    }
    expect(ApplicationResolveResponseSchema.parse(res)).toEqual(res)
  })

  it('rejects unknown type/env/scope', () => {
    expect(() =>
      ApplicationResolveResponseSchema.parse({
        applicationId: 'app_abc',
        slug: 'acme',
        name: 'Acme',
        type: 'evil',
      })
    ).toThrow()
  })
})
