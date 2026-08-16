/**
 * Unit tests for ProviderRegistry health-check runner + circuit breaker.
 *
 * We register a `custom` provider type by overriding `createInstance` in a
 * test subclass so we can plug in mock providers that expose a controllable
 * `healthCheck()`. This avoids mocking the real SDK network clients and keeps
 * the focus on the state machine + event emission.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import {
  PROVIDER_STATUS_CHANGED_EVENT,
  ProviderRegistry,
} from '../../../server/registry/ProviderRegistry.js'
import type { IAIProvider, HealthCheckResult } from '../../../server/providers/base.js'
import type {
  ProviderConfig,
  ProviderStatusChangedPayload,
} from '../../../server/registry/types.js'

/**
 * Test double IAIProvider with a controllable healthCheck() + minimal
 * sendMessage stub.
 */
class MockProvider implements IAIProvider {
  private model: string
  public healthCheckImpl: (signal?: AbortSignal) => Promise<HealthCheckResult>

  constructor(model = 'mock-model') {
    this.model = model
    this.healthCheckImpl = async () => ({ ok: true, latencyMs: 10 })
  }

  async sendMessage(): Promise<{ text: string }> {
    return { text: 'ok' }
  }
  validateConfig(): void {}
  getModel(): string {
    return this.model
  }
  setModel(newModel: string): void {
    this.model = newModel
  }
  async healthCheck(signal?: AbortSignal): Promise<HealthCheckResult> {
    return this.healthCheckImpl(signal)
  }
}

/**
 * Registry subclass that builds MockProvider instead of hitting real SDKs.
 * We key off `type === 'custom'` + a secret provider instance stuffed in
 * `metadata.__instance` so tests can retrieve their mock.
 */
class TestRegistry extends ProviderRegistry {
  // Prebuild instances here so the base class can look them up via type='custom'.
  registerMock(id: string, provider: MockProvider): void {
    const config: ProviderConfig = {
      id,
      name: `Mock ${id}`,
      type: 'custom',
      enabled: true,
      model: 'mock-model',
      capabilities: {
        text: true,
        vision: false,
        audio: false,
        streaming: false,
        functionCalling: false,
        jsonMode: false,
      },
    }
    // Store in the private maps via a patched register that skips createInstance.
    this.injectMock(config, provider)
  }

  // Access private maps via the parent by calling a helper we add below.
  private injectMock(config: ProviderConfig, instance: IAIProvider): void {
    // Cheat: use a public setter exposed by the test subclass below.
    ;(this as unknown as InternalMaps).providers.set(config.id, config)
    ;(this as unknown as InternalMaps).instances.set(config.id, instance)
    ;(this as unknown as InternalMaps).health.set(config.id, {
      status: 'unknown',
      consecutiveFailures: 0,
    })
  }
}

interface InternalMaps {
  providers: Map<string, ProviderConfig>
  instances: Map<string, IAIProvider>
  health: Map<
    string,
    {
      status: string
      consecutiveFailures: number
      lastHealthCheckAt?: number
      lastLatencyMs?: number
      lastHealthCheckError?: string
    }
  >
}

describe('ProviderRegistry — health check runner', () => {
  let registry: TestRegistry
  let provider: MockProvider

  beforeEach(() => {
    registry = new TestRegistry()
    provider = new MockProvider()
    registry.registerMock('p1', provider)
  })

  it('initial status is "unknown" before any check runs', () => {
    const health = registry.getHealth('p1')
    expect(health?.status).toBe('unknown')
    expect(health?.consecutiveFailures).toBe(0)
  })

  it('a single successful probe transitions status to "active"', async () => {
    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 50 })
    const [state] = await registry.runHealthChecks()
    expect(state.status).toBe('active')
    expect(state.consecutiveFailures).toBe(0)
    expect(state.lastLatencyMs).toBe(50)
    expect(state.lastHealthCheckError).toBeUndefined()
  })

  it('a successful but slow probe transitions to "degraded"', async () => {
    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 4000 })
    const [state] = await registry.runHealthChecks({ degradedLatencyMs: 3000 })
    expect(state.status).toBe('degraded')
  })

  it('single failed probe stays "degraded" when below threshold', async () => {
    provider.healthCheckImpl = async () => ({ ok: false, error: 'boom' })
    const [state] = await registry.runHealthChecks({ failureThreshold: 3 })
    expect(state.status).toBe('degraded')
    expect(state.consecutiveFailures).toBe(1)
    expect(state.lastHealthCheckError).toBe('boom')
  })

  it('circuit breaker flips to "disabled" after N consecutive failures', async () => {
    provider.healthCheckImpl = async () => ({ ok: false, error: '500' })

    await registry.runHealthChecks({ failureThreshold: 3 })
    await registry.runHealthChecks({ failureThreshold: 3 })
    const [state] = await registry.runHealthChecks({ failureThreshold: 3 })

    expect(state.status).toBe('disabled')
    expect(state.consecutiveFailures).toBe(3)
  })

  it('a successful probe resets counter and re-enables a disabled provider', async () => {
    // Trip the breaker.
    provider.healthCheckImpl = async () => ({ ok: false, error: 'down' })
    await registry.runHealthChecks({ failureThreshold: 3 })
    await registry.runHealthChecks({ failureThreshold: 3 })
    await registry.runHealthChecks({ failureThreshold: 3 })
    expect(registry.getHealth('p1')?.status).toBe('disabled')

    // Provider comes back.
    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 20 })
    const [state] = await registry.runHealthChecks({ failureThreshold: 3 })
    expect(state.status).toBe('active')
    expect(state.consecutiveFailures).toBe(0)
  })

  it('getInstance() throws when provider is auto-disabled by the circuit breaker', async () => {
    provider.healthCheckImpl = async () => ({ ok: false, error: 'down' })
    await registry.runHealthChecks({ failureThreshold: 2 })
    await registry.runHealthChecks({ failureThreshold: 2 })
    expect(() => registry.getInstance('p1')).toThrowError(/auto-disabled/)
  })

  it('timeout is treated as a failure with a "timed out" message', async () => {
    provider.healthCheckImpl = () =>
      new Promise<HealthCheckResult>(resolve => {
        setTimeout(() => resolve({ ok: true, latencyMs: 9999 }), 100)
      })
    const [state] = await registry.runHealthChecks({ timeoutMs: 20 })
    expect(state.status).toBe('degraded') // 1 failure, threshold=3 default
    expect(state.lastHealthCheckError).toMatch(/timed out/)
  })

  it('emits "provider.status.changed" when status transitions', async () => {
    const events: ProviderStatusChangedPayload[] = []
    registry.on(PROVIDER_STATUS_CHANGED_EVENT, (payload: ProviderStatusChangedPayload) => {
      events.push(payload)
    })

    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 10 })
    await registry.runHealthChecks()
    // unknown → active
    expect(events).toHaveLength(1)
    expect(events[0]?.previous).toBe('unknown')
    expect(events[0]?.current).toBe('active')

    // active → active (no event)
    await registry.runHealthChecks()
    expect(events).toHaveLength(1)

    // active → degraded
    provider.healthCheckImpl = async () => ({ ok: false, error: 'oops' })
    await registry.runHealthChecks({ failureThreshold: 3 })
    expect(events).toHaveLength(2)
    expect(events[1]?.current).toBe('degraded')
  })

  it('getStatus() returns a snapshot for every registered provider', async () => {
    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 15 })
    await registry.runHealthChecks()

    const snapshot = registry.getStatus()
    expect(snapshot).toHaveLength(1)
    expect(snapshot[0]).toMatchObject({
      id: 'p1',
      enabled: true,
      available: true,
      health: { status: 'active', consecutiveFailures: 0 },
    })
  })

  it('getStatus() marks auto-disabled providers as available=false', async () => {
    provider.healthCheckImpl = async () => ({ ok: false, error: 'bad' })
    await registry.runHealthChecks({ failureThreshold: 1 })

    const [snap] = registry.getStatus()
    expect(snap?.available).toBe(false)
    expect(snap?.health.status).toBe('disabled')
  })

  it('getStatus() marks user-disabled providers as available=false even when healthy', async () => {
    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 10 })
    await registry.runHealthChecks()
    registry.setEnabled('p1', false)

    const [snap] = registry.getStatus()
    expect(snap?.available).toBe(false)
    expect(snap?.enabled).toBe(false)
    expect(snap?.health.status).toBe('active') // health untouched
  })

  it('providers without a healthCheck() method are treated as healthy', async () => {
    const registry2 = new TestRegistry()
    class NoHealthProvider implements IAIProvider {
      async sendMessage(): Promise<{ text: string }> {
        return { text: 'ok' }
      }
      validateConfig(): void {}
      getModel(): string {
        return 'm'
      }
      setModel(): void {}
      // intentionally no healthCheck
    }
    registry2.registerMock('no-hc', new NoHealthProvider() as unknown as MockProvider)
    const [state] = await registry2.runHealthChecks()
    expect(state.status).toBe('active')
    expect(state.lastLatencyMs).toBe(0)
  })

  it('multiple providers are probed in parallel and update independently', async () => {
    const p2 = new MockProvider()
    registry.registerMock('p2', p2)

    provider.healthCheckImpl = async () => ({ ok: true, latencyMs: 10 })
    p2.healthCheckImpl = async () => ({ ok: false, error: 'nope' })

    await registry.runHealthChecks({ failureThreshold: 1 })

    expect(registry.getHealth('p1')?.status).toBe('active')
    expect(registry.getHealth('p2')?.status).toBe('disabled')
  })
})

describe('ProviderRegistry — scheduler', () => {
  it('startHealthCheckScheduler runs checks on interval and stop() cancels', async () => {
    const registry = new TestRegistry()
    const provider = new MockProvider()
    registry.registerMock('p1', provider)

    let count = 0
    provider.healthCheckImpl = async () => {
      count++
      return { ok: true, latencyMs: 5 }
    }

    const stop = registry.startHealthCheckScheduler({ intervalMs: 30 })

    // Wait enough real time for: initial run + 2 ticks.
    await new Promise(resolve => setTimeout(resolve, 100))
    const countAfter100ms = count
    expect(countAfter100ms).toBeGreaterThanOrEqual(2)

    stop()
    const countAtStop = count

    // After stop, no further ticks should fire.
    await new Promise(resolve => setTimeout(resolve, 80))
    expect(count).toBe(countAtStop)
  })

  it('startHealthCheckScheduler swallows errors without stopping the timer', async () => {
    const registry = new TestRegistry()
    const provider = new MockProvider()
    registry.registerMock('p1', provider)

    let calls = 0
    provider.healthCheckImpl = async () => {
      calls++
      if (calls === 1) throw new Error('first-run fails')
      return { ok: true, latencyMs: 5 }
    }

    const stop = registry.startHealthCheckScheduler({ intervalMs: 20 })
    await new Promise(resolve => setTimeout(resolve, 80))
    stop()

    expect(calls).toBeGreaterThanOrEqual(2)
  })
})
