/**
 * Shared Zod schemas for the E2E Test Matrix routes.
 *
 * Kept in one place so OpenAPI docs and handlers reference identical shapes,
 * and so the seeder + CLI helper can reuse the same input validators.
 */

import { z } from 'zod'
import {
  E2E_APPS,
  E2E_CADENCES,
  E2E_CATEGORIES,
  E2E_PRIORITIES,
} from '../../models/E2ETestDefinition.js'
import { E2E_RUN_ENVS, E2E_RUN_STATUSES } from '../../models/E2ETestRun.js'

/** A test slug — lowercase letters, numbers, dots, dashes. */
export const TestIdSchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/, {
    message: 'testId must be lowercase alphanumeric with dots/dashes (e.g. ezauth.login.email)',
  })
  .describe('Stable, unique test identifier (e.g. "ezauth.login.email-password")')

export const E2EAppEnum = z.enum(E2E_APPS).describe('Target app slug')
export const E2ECategoryEnum = z.enum(E2E_CATEGORIES).describe('Functional category')
export const E2ECadenceEnum = z.enum(E2E_CADENCES).describe('When the test should re-run')
export const E2EPriorityEnum = z.enum(E2E_PRIORITIES).describe('Priority bucket (P0..P3)')
export const E2ERunStatusEnum = z.enum(E2E_RUN_STATUSES).describe('Outcome of a run')
export const E2ERunEnvEnum = z
  .enum(E2E_RUN_ENVS)
  .describe('Environment in which the run was executed (local | staging | production)')

export const UpsertDefinitionSchema = z.object({
  testId: TestIdSchema,
  app: E2EAppEnum,
  feature: z.string().min(1).max(100).describe('High-level feature name'),
  category: E2ECategoryEnum,
  description: z.string().min(1).max(500),
  routesExercised: z.array(z.string().max(500)).max(50).default([]),
  filesExercised: z.array(z.string().max(500)).max(100).default([]),
  cadence: E2ECadenceEnum.default('when-feature-touched'),
  priority: E2EPriorityEnum.default('P1'),
})

export type UpsertDefinitionInput = z.infer<typeof UpsertDefinitionSchema>

export const RecordRunSchema = z.object({
  testId: TestIdSchema,
  status: E2ERunStatusEnum,
  env: E2ERunEnvEnum.describe(
    'Environment in which the run was executed — required (local | staging | production)'
  ),
  agent: z.string().min(1).max(100),
  agentVersion: z.string().max(100).optional(),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000)
    .optional(),
  errors: z.array(z.string().max(2000)).max(50).optional(),
  notes: z.string().max(4000).optional(),
  fileSnapshotSha: z.string().max(64).optional(),
  triggeredBy: z.string().max(100).optional(),
  runAt: z.coerce.date().optional(),
})

export type RecordRunInput = z.infer<typeof RecordRunSchema>

/**
 * `env` filter for list/needs-rerun endpoints. Accepts the canonical envs or
 * the literal string `'all'` to disable filtering. Defaults to `'all'` for
 * backwards-compatibility with consumers that pre-date the env dimension.
 */
export const EnvFilterSchema = z
  .union([E2ERunEnvEnum, z.literal('all')])
  .default('all')
  .describe('Filter runs by env — pass "all" (default) to include every env')

export const ListDefinitionsQuerySchema = z.object({
  app: E2EAppEnum.optional(),
  category: E2ECategoryEnum.optional(),
  feature: z.string().max(100).optional(),
  priority: E2EPriorityEnum.optional(),
  status: E2ERunStatusEnum.optional().describe('Filter by latest run status'),
  env: EnvFilterSchema,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type ListDefinitionsQuery = z.infer<typeof ListDefinitionsQuerySchema>
