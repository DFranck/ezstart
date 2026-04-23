/**
 * Vitest setup for @ezstart/ai-sdk
 *
 * Mocks out logger + config so unit tests stay isolated and never hit real
 * providers or the network.
 */

import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock @ezstart/logger — noop
// ---------------------------------------------------------------------------
vi.mock('@ezstart/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock @ezstart/config — noop shims
// ---------------------------------------------------------------------------
vi.mock('@ezstart/config', () => ({
  getApiUrl: vi.fn((_app: string) => 'http://localhost:6100'),
  getWebUrl: vi.fn((_app: string) => 'http://localhost:6101'),
}))

// ---------------------------------------------------------------------------
// Ensure no real API key leaks into tests
// ---------------------------------------------------------------------------
delete process.env.ANTHROPIC_API_KEY
delete process.env.OPENAI_API_KEY
delete process.env.GEMINI_API_KEY
