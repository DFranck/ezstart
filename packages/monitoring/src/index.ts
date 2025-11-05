/**
 * @ezstart/monitoring
 *
 * Centralized monitoring, auditing, and observability system for @ezstart monorepo
 *
 * This package provides:
 * - Type-safe monitoring types
 * - Health check utilities
 * - Audit tracking
 * - Deployment monitoring
 * - Database health checks
 * - Git/commit tracking
 * - Metrics and dashboard data
 *
 * @example
 * ```typescript
 * import { MONITORED_SERVICES, HealthChecker } from '@ezstart/monitoring'
 *
 * const checker = new HealthChecker()
 * const result = await checker.check({
 *   name: 'EZAuth API',
 *   type: 'api',
 *   url: 'http://localhost:5010/api/health',
 *   timeout: 5000,
 *   interval: 30000,
 *   retries: 3,
 * })
 * ```
 */

// Types
export * from './types/index.js'

// Utilities
export * from './utils/index.js'

// Collectors
export * from './collectors/index.js'

// Client-side monitoring (React components and hooks)
// Note: Only use these exports in Next.js apps with 'use client' directive
export * from './client/index.js'
