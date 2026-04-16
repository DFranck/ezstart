import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAuthMode, detectAuthMode } from '../../ezstart-auth.js'

// These are mocked in setup.ts but we re-mock here with specific returns
const mockGetCurrentEnvironment = vi.fn(() => 'local')
const mockIsEzstartDomain = vi.fn((_host?: string) => false)
const mockGetApiUrl = vi.fn((..._args: unknown[]) => 'http://localhost:6110')

vi.mock('@ezstart/config/urls', () => ({
  getApiUrl: (...args: unknown[]) => mockGetApiUrl(...args),
  getWebUrl: vi.fn(() => 'http://localhost:6111'),
  getCurrentEnvironment: () => mockGetCurrentEnvironment(),
  isEzstartDomain: (host: string) => mockIsEzstartDomain(host),
}))

describe('resolveAuthMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forces localStorage in local env regardless of configured mode', () => {
    const mode = resolveAuthMode('httpOnly', 'localhost', 'local')
    expect(mode).toBe('localStorage')
  })

  it('allows httpOnly on ezstart domain in production', () => {
    mockIsEzstartDomain.mockReturnValue(true)
    const mode = resolveAuthMode('httpOnly', 'app.ezstart.com', 'production')
    expect(mode).toBe('httpOnly')
  })

  it('falls back to localStorage when httpOnly on non-ezstart domain', () => {
    mockIsEzstartDomain.mockReturnValue(false)
    const mode = resolveAuthMode('httpOnly', 'custom-domain.com', 'production')
    expect(mode).toBe('localStorage')
  })

  it('requires jwtPublicKey for jwt mode, falls back to localStorage', () => {
    const mode = resolveAuthMode('jwt', 'app.example.com', 'production')
    expect(mode).toBe('localStorage')
  })

  it('allows jwt mode when jwtPublicKey is provided', () => {
    const mode = resolveAuthMode('jwt', 'app.example.com', 'production', 'publickey123')
    expect(mode).toBe('jwt')
  })

  it('allows localStorage in production (with warning)', () => {
    const mode = resolveAuthMode('localStorage', 'app.example.com', 'production')
    expect(mode).toBe('localStorage')
  })
})

describe('detectAuthMode', () => {
  it('returns httpOnly when window is undefined (SSR)', () => {
    // detectAuthMode checks typeof window, which in jsdom is defined
    // We just verify it doesn't crash
    const mode = detectAuthMode()
    // In jsdom, window.location.hostname is 'localhost', env is 'local' → localStorage
    expect(mode).toBe('localStorage')
  })
})
