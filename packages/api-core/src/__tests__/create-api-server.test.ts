/**
 * Smoke tests for the pre-configured @ezstart wrapper.
 *
 * We mock `@ezstart/config/urls` + `@ezstart/config/cors` + `@ezstart/logger/server`
 * so the test stays hermetic and does not depend on package builds.
 */

import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@ezstart/config/urls', () => ({
  getPort: (_appName: string, _layer: string) => 9876,
}))

vi.mock('@ezstart/config/cors', () => ({
  getAllowedOrigins: (_appName: string) => ['https://myapp.example.com'],
}))

const monorepoLoggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@ezstart/logger/server', () => ({
  logger: monorepoLoggerMock,
}))

describe('createApiServer (pre-configured wrapper)', () => {
  beforeEach(() => {
    Object.values(monorepoLoggerMock).forEach(fn => fn.mockReset())
  })

  afterEach(() => {
    delete process.env.PORT
  })

  it('resolves port from @ezstart/config and serviceName from the appName', async () => {
    const { createApiServer } = await import('../create-api-server.js')

    const { config } = createApiServer('ezstart')
    expect(config.port).toBe(9876)
    expect(config.serviceName).toBe('ezstart')
  })

  it('allows overriding the port explicitly', async () => {
    const { createApiServer } = await import('../create-api-server.js')

    const { config } = createApiServer('ezstart', { port: 4321 })
    expect(config.port).toBe(4321)
  })

  it('respects process.env.PORT when no explicit port is passed', async () => {
    process.env.PORT = '5555'
    const { createApiServer } = await import('../create-api-server.js')

    const { config } = createApiServer('ezstart')
    expect(config.port).toBe(5555)
  })

  it('wires CORS from getAllowedOrigins and serves health', async () => {
    const { createApiServer } = await import('../create-api-server.js')

    const { app } = createApiServer('ezstart')
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', service: 'ezstart' })

    // Legacy /api/health still works
    const legacy = await request(app).get('/api/health')
    expect(legacy.status).toBe(200)
    expect(legacy.body).toMatchObject({ status: 'ok', service: 'ezstart' })
  })
})
