/**
 * Client-side monitoring utilities and components
 *
 * This module contains React components and utilities for client-side monitoring.
 * Only use these in Next.js apps (requires 'use client' directive).
 *
 * @example
 * ```tsx
 * import {
 *   MonitoringDashboard,
 *   HealthScoreCard,
 *   SystemOverview,
 *   MetricCard,
 *   ServiceStatusCard,
 *   AuditCard,
 *   ErrorCard,
 *   PlausibleAnalytics,
 *   usePerformance,
 *   calculateOverallHealth,
 * } from '@ezstart/monitoring/client'
 * ```
 */

// Dashboard components
export * from './components/index.js'

// Analytics & hooks
export * from './PlausibleAnalytics.js'
export * from './usePerformance.js'

// Utility functions (pure, no React dependency)
export * from './utils.js'
