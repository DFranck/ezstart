/**
 * Unit tests for `validateRedirectUri` + `validateRedirectUriForApp`.
 *
 * Covers HAC-HIGH-3 (RFC 6749 §3.1.2 per-Application exact-match
 * allowlist). The /token cross-check (HAC-HIGH-4) is covered in
 * `routes/oauth/redirect-uri-validation.test.ts`.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { getApplicationModel } from '../../models/application.js'
import {
  validateRedirectUri,
  validateRedirectUriForApp,
} from '../../services/oauth-redirect-uri.service.js'

describe('validateRedirectUri (pure)', () => {
  const app = {
    redirectUris: ['https://acme.example.com/callback', 'http://localhost:3000/auth/callback'],
  }

  it('returns true on exact match (https)', () => {
    expect(validateRedirectUri(app, 'https://acme.example.com/callback')).toBe(true)
  })

  it('returns true on exact match (http localhost)', () => {
    expect(validateRedirectUri(app, 'http://localhost:3000/auth/callback')).toBe(true)
  })

  it('rejects trailing-slash drift', () => {
    expect(validateRedirectUri(app, 'https://acme.example.com/callback/')).toBe(false)
  })

  it('rejects case drift on host', () => {
    expect(validateRedirectUri(app, 'https://ACME.example.com/callback')).toBe(false)
  })

  it('rejects scheme downgrade (https registered → http presented)', () => {
    expect(validateRedirectUri(app, 'http://acme.example.com/callback')).toBe(false)
  })

  it('rejects querystring injection', () => {
    expect(
      validateRedirectUri(app, 'https://acme.example.com/callback?next=https://evil.com')
    ).toBe(false)
  })

  it('rejects null / undefined / empty input', () => {
    expect(validateRedirectUri(app, null)).toBe(false)
    expect(validateRedirectUri(app, undefined)).toBe(false)
    expect(validateRedirectUri(app, '')).toBe(false)
  })

  it('rejects when application is null/undefined (fail-closed)', () => {
    expect(validateRedirectUri(null, 'https://acme.example.com/callback')).toBe(false)
    expect(validateRedirectUri(undefined, 'https://acme.example.com/callback')).toBe(false)
  })

  it('rejects when redirectUris is empty (OAuth disabled, fail-closed)', () => {
    expect(validateRedirectUri({ redirectUris: [] }, 'https://acme.example.com/callback')).toBe(
      false
    )
    expect(validateRedirectUri({}, 'https://acme.example.com/callback')).toBe(false)
  })

  it('rejects path drift (same host, different path)', () => {
    expect(validateRedirectUri(app, 'https://acme.example.com/other-callback')).toBe(false)
  })

  it('rejects subdomain drift (homograph-style hijack attempt)', () => {
    expect(validateRedirectUri(app, 'https://attacker-acme.example.com/callback')).toBe(false)
  })
})

describe('validateRedirectUriForApp (DB integration)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    const Application = await getApplicationModel()
    await Application.deleteMany({})
  })

  it('returns true when slug exists and URI is registered', async () => {
    const Application = await getApplicationModel()
    await Application.create({
      slug: 'redir-app-1',
      name: 'Redir App 1',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      redirectUris: ['https://app1.example.com/cb'],
    })

    const ok = await validateRedirectUriForApp('redir-app-1', 'https://app1.example.com/cb')
    expect(ok).toBe(true)
  })

  it('returns false on unknown slug', async () => {
    const ok = await validateRedirectUriForApp('does-not-exist', 'https://app1.example.com/cb')
    expect(ok).toBe(false)
  })

  it('returns false when Application has empty redirectUris (fail-closed)', async () => {
    const Application = await getApplicationModel()
    await Application.create({
      slug: 'redir-empty',
      name: 'Redir Empty',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      // redirectUris omitted → defaults to []
    })

    const ok = await validateRedirectUriForApp('redir-empty', 'https://app1.example.com/cb')
    expect(ok).toBe(false)
  })

  it('returns false on path mismatch even when host is registered', async () => {
    const Application = await getApplicationModel()
    await Application.create({
      slug: 'redir-path',
      name: 'Redir Path',
      ownerId: 'owner-1',
      themeEnabled: false,
      isPlatformOwned: false,
      requireEmailVerification: false,
      isTestMode: false,
      redirectUris: ['https://app1.example.com/cb'],
    })

    const ok = await validateRedirectUriForApp('redir-path', 'https://app1.example.com/other')
    expect(ok).toBe(false)
  })

  it('rejects creation of Application with invalid redirectUris (validator)', async () => {
    const Application = await getApplicationModel()
    await expect(
      Application.create({
        slug: 'redir-invalid',
        name: 'Redir Invalid',
        ownerId: 'owner-1',
        themeEnabled: false,
        isPlatformOwned: false,
        requireEmailVerification: false,
        isTestMode: false,
        redirectUris: ['not-a-url', 'https://valid.example.com/cb'],
      })
    ).rejects.toThrow(/redirectUris must each be a valid http\(s\) URL/)
  })

  it('rejects ftp:// scheme (validator)', async () => {
    const Application = await getApplicationModel()
    await expect(
      Application.create({
        slug: 'redir-ftp',
        name: 'Redir FTP',
        ownerId: 'owner-1',
        themeEnabled: false,
        isPlatformOwned: false,
        requireEmailVerification: false,
        isTestMode: false,
        redirectUris: ['ftp://app1.example.com/cb'],
      })
    ).rejects.toThrow(/valid http\(s\) URL/)
  })
})
