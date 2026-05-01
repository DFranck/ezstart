/**
 * AI Provider Registry
 * Manages multiple AI providers dynamically
 */

import '../_internal/server-only.js'

import { EventEmitter } from 'node:events'
import { logger } from '@ezstart/logger'
import type {
  ProviderConfig,
  AIProviderInfo,
  ProviderHealthState,
  ProviderHealthStatus,
  HealthCheckRunnerOptions,
  ProviderStatusChangedPayload,
} from './types.js'
import type { IAIProvider, HealthCheckResult } from '../providers/base.js'
import { AnthropicProvider } from '../providers/anthropic.js'
import { GeminiProvider } from '../providers/gemini.js'
import { OpenAIProvider } from '../providers/openai.js'

const DEFAULT_HEALTH_TIMEOUT_MS = 5_000
const DEFAULT_FAILURE_THRESHOLD = 3
const DEFAULT_DEGRADED_LATENCY_MS = 3_000

/**
 * Event name emitted on the registry when a provider's health status changes.
 * Payload: {@link ProviderStatusChangedPayload}.
 */
export const PROVIDER_STATUS_CHANGED_EVENT = 'provider.status.changed'

/**
 * Shape of the detailed provider snapshot returned by {@link ProviderRegistry.getStatus}.
 */
export interface ProviderStatusSnapshot {
  id: string
  name: string
  type: ProviderConfig['type']
  /** User-controlled flag (true = consumer wants this provider active). */
  enabled: boolean
  model: string
  health: ProviderHealthState
  /**
   * Effective availability: `true` iff `enabled && health.status !== 'disabled'`.
   * Consumers can use this single boolean to decide whether to route traffic.
   */
  available: boolean
}

export class ProviderRegistry extends EventEmitter {
  private providers: Map<string, ProviderConfig> = new Map()
  private instances: Map<string, IAIProvider> = new Map()
  private health: Map<string, ProviderHealthState> = new Map()

  /**
   * Register a new AI provider
   */
  register(config: ProviderConfig): void {
    this.providers.set(config.id, config)

    // Create instance
    const instance = this.createInstance(config)
    this.instances.set(config.id, instance)

    // Initial health state — unknown until first check runs.
    this.health.set(config.id, { status: 'unknown', consecutiveFailures: 0 })

    logger.info(`Registered AI provider: ${config.name} (${config.type})`)
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): void {
    this.providers.delete(id)
    this.instances.delete(id)
    this.health.delete(id)
    logger.info(`Unregistered AI provider: ${id}`)
  }

  /**
   * Get provider instance. Throws when the provider is not found, explicitly
   * disabled by the user (`enabled=false`), or has been auto-disabled by the
   * circuit breaker (`health.status='disabled'`).
   */
  getInstance(id: string): IAIProvider {
    const instance = this.instances.get(id)
    if (!instance) {
      const available = Array.from(this.providers.keys()).join(', ')
      throw new Error(`Provider "${id}" not found. Available: ${available}`)
    }

    const config = this.providers.get(id)
    if (config && !config.enabled) {
      throw new Error(`Provider "${id}" is disabled`)
    }

    const health = this.health.get(id)
    if (health && health.status === 'disabled') {
      throw new Error(
        `Provider "${id}" is auto-disabled (circuit breaker): ${health.lastHealthCheckError ?? 'unhealthy'}`
      )
    }

    return instance
  }

  /**
   * List all providers (public info only)
   */
  list(): AIProviderInfo[] {
    return Array.from(this.providers.values()).map(config => ({
      id: config.id,
      name: config.name,
      type: config.type,
      enabled: config.enabled,
      capabilities: config.capabilities,
      model: config.model,
      health: this.getHealth(config.id),
    }))
  }

  /**
   * List only enabled providers
   */
  listEnabled(): AIProviderInfo[] {
    return this.list().filter(p => p.enabled)
  }

  /**
   * Get provider config (full)
   */
  getConfig(id: string): ProviderConfig | undefined {
    return this.providers.get(id)
  }

  /**
   * Get the current health state for a provider. Returns `undefined` when the
   * provider id is unknown.
   */
  getHealth(id: string): ProviderHealthState | undefined {
    const state = this.health.get(id)
    if (!state) return undefined
    // Return a shallow copy to prevent external mutation.
    return { ...state }
  }

  /**
   * Get a detailed status snapshot for every registered provider — intended
   * for the admin/status endpoint.
   */
  getStatus(): ProviderStatusSnapshot[] {
    return Array.from(this.providers.values()).map(config => {
      const health = this.health.get(config.id) ?? { status: 'unknown', consecutiveFailures: 0 }
      return {
        id: config.id,
        name: config.name,
        type: config.type,
        enabled: config.enabled,
        model: config.model,
        health: { ...health },
        available: config.enabled && health.status !== 'disabled',
      }
    })
  }

  /**
   * Update provider enabled status
   */
  setEnabled(id: string, enabled: boolean): void {
    const config = this.providers.get(id)
    if (config) {
      config.enabled = enabled
      const status = enabled ? 'enabled' : 'disabled'
      logger.info(`Provider "${id}" ${status}`)
    }
  }

  /**
   * Update the default model of a registered provider at runtime.
   *
   * - Updates the live provider instance (next `sendMessage()` calls without
   *   a per-request `options.model` override use the new model).
   * - Updates the stored `ProviderConfig.model` so `list()` / `getConfig()`
   *   reflect the change.
   * - Does NOT affect requests already in flight (each request captures its
   *   model at the start of `sendMessage`), so this is safe to call
   *   concurrently with running requests.
   *
   * Throws if the provider id is unknown or the new model is invalid.
   */
  updateModel(id: string, newModel: string): void {
    const instance = this.instances.get(id)
    const config = this.providers.get(id)
    if (!instance || !config) {
      const available = Array.from(this.providers.keys()).join(', ')
      throw new Error(`Provider "${id}" not found. Available: ${available}`)
    }
    instance.setModel(newModel) // also validates the model name
    config.model = newModel
    logger.info(`Provider "${id}" model updated to "${newModel}"`)
  }

  /**
   * Run a health check against every registered provider in parallel.
   *
   * Each probe runs with a per-provider timeout (default 5s). Results update
   * the provider's {@link ProviderHealthState} and flip the public `status`
   * field using the circuit-breaker rules:
   *
   * - Success with latency < `degradedLatencyMs` → `active`, reset counter.
   * - Success with latency >= `degradedLatencyMs` → `degraded`, reset counter.
   * - Failure → increment counter. When counter >= `failureThreshold`,
   *   status becomes `disabled`. Below the threshold it is `degraded`.
   *
   * Emits a `provider.status.changed` event whenever a provider's status
   * transitions. Continues probing disabled providers so recovery is automatic.
   */
  async runHealthChecks(options: HealthCheckRunnerOptions = {}): Promise<ProviderHealthState[]> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS
    const failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD
    const degradedLatencyMs = options.degradedLatencyMs ?? DEFAULT_DEGRADED_LATENCY_MS

    const ids = Array.from(this.providers.keys())
    const results = await Promise.all(
      ids.map(id => this.probeOne(id, { timeoutMs, failureThreshold, degradedLatencyMs }))
    )
    return results
  }

  /**
   * Run a health probe on a single provider and update its state. Exposed so
   * callers can re-check a specific provider without iterating everyone.
   */
  async probeOne(
    id: string,
    options: Required<HealthCheckRunnerOptions>
  ): Promise<ProviderHealthState> {
    const instance = this.instances.get(id)
    const previousState = this.health.get(id) ?? { status: 'unknown', consecutiveFailures: 0 }
    const previousStatus: ProviderHealthStatus = previousState.status

    if (!instance) {
      return previousState
    }

    const result = await runWithTimeout(instance, options.timeoutMs)
    const next = computeNextState(previousState, result, {
      failureThreshold: options.failureThreshold,
      degradedLatencyMs: options.degradedLatencyMs,
    })

    this.health.set(id, next)

    if (next.status !== previousStatus) {
      logger.info(
        `Provider "${id}" health changed: ${previousStatus} → ${next.status}` +
          (next.lastHealthCheckError ? ` (${next.lastHealthCheckError})` : '')
      )
      const payload: ProviderStatusChangedPayload = {
        id,
        previous: previousStatus,
        current: next.status,
        health: { ...next },
      }
      this.emit(PROVIDER_STATUS_CHANGED_EVENT, payload)
    }

    return next
  }

  /**
   * Start a background scheduler that calls {@link runHealthChecks} on an
   * interval. Returns a `stop()` function that cancels the scheduler.
   *
   * The first run is kicked off immediately (non-blocking). Subsequent runs
   * fire every `intervalMs` (default 5 minutes). If a run is still in flight
   * when the timer ticks, the next run is skipped — no overlap.
   */
  startHealthCheckScheduler(
    options: HealthCheckRunnerOptions & { intervalMs?: number } = {}
  ): () => void {
    const intervalMs = options.intervalMs ?? 5 * 60 * 1000
    let stopped = false
    let running = false

    const tick = async (): Promise<void> => {
      if (stopped || running) return
      running = true
      try {
        await this.runHealthChecks(options)
      } catch (error) {
        logger.error('Health check scheduler error', error as Error)
      } finally {
        running = false
      }
    }

    // Fire-and-forget initial run so callers see status quickly on boot.
    void tick()
    const handle = setInterval(() => {
      void tick()
    }, intervalMs)
    // Allow the Node process to exit even if the scheduler is running.
    if (typeof handle.unref === 'function') handle.unref()

    return () => {
      stopped = true
      clearInterval(handle)
    }
  }

  /**
   * Create provider instance from config
   */
  private createInstance(config: ProviderConfig): IAIProvider {
    switch (config.type) {
      case 'gemini':
        return new GeminiProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'openai':
        return new OpenAIProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: config.apiKey,
          model: config.model,
        })

      case 'custom':
        throw new Error('Custom provider must be provided via constructor')

      default:
        throw new Error(`Unknown provider type: ${config.type}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a provider's healthCheck with a hard timeout. Providers that don't
 * implement `healthCheck` are considered OK (backward compatible).
 */
async function runWithTimeout(
  instance: IAIProvider,
  timeoutMs: number
): Promise<HealthCheckResult> {
  if (typeof instance.healthCheck !== 'function') {
    return { ok: true, latencyMs: 0 }
  }

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()
  try {
    const result = await Promise.race<HealthCheckResult>([
      instance.healthCheck(controller.signal),
      new Promise<HealthCheckResult>(resolve => {
        controller.signal.addEventListener('abort', () => {
          resolve({
            ok: false,
            latencyMs: Date.now() - started,
            error: `Health check timed out after ${timeoutMs}ms`,
          })
        })
      }),
    ])
    return result
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

/**
 * Pure state-transition function — given the previous state + probe result,
 * produce the next state. Exported implicitly via `computeNextState` so it
 * can be unit tested without touching the registry class.
 */
function computeNextState(
  previous: ProviderHealthState,
  result: HealthCheckResult,
  thresholds: { failureThreshold: number; degradedLatencyMs: number }
): ProviderHealthState {
  const now = Date.now()
  if (result.ok) {
    const status: ProviderHealthStatus =
      typeof result.latencyMs === 'number' && result.latencyMs >= thresholds.degradedLatencyMs
        ? 'degraded'
        : 'active'
    return {
      status,
      consecutiveFailures: 0,
      lastHealthCheckAt: now,
      lastLatencyMs: result.latencyMs,
      lastHealthCheckError: undefined,
    }
  }

  const nextFailures = previous.consecutiveFailures + 1
  const status: ProviderHealthStatus =
    nextFailures >= thresholds.failureThreshold ? 'disabled' : 'degraded'
  return {
    status,
    consecutiveFailures: nextFailures,
    lastHealthCheckAt: now,
    lastLatencyMs: result.latencyMs,
    lastHealthCheckError: result.error ?? 'Unknown error',
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry()
