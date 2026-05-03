/**
 * E2E Test Definition model — registry of all known E2E tests.
 *
 * Seeded via `seed-e2e-test-definitions.ts` (idempotent upserts) and rarely
 * edited by hand. Each definition represents ONE testable behavior of an app
 * (e.g. "ezauth.login.email-password"). Test runs reference this via `testId`.
 *
 * Collection: `e2etestdefinitions` (Mongoose pluralizes; we explicitly set the
 * collection name to keep it predictable across environments).
 *
 * See `.claude/rules/standard-saas.md` + `mongodb.md` for factory pattern.
 */

import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Model } from 'mongoose'

export const E2E_APPS = [
  'ezauth',
  'ezpay',
  'ezstart',
  'ezbill',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
] as const

export type E2EApp = (typeof E2E_APPS)[number]

export const E2E_CATEGORIES = [
  'public',
  'auth',
  'dashboard',
  'admin',
  'pay-flow',
  'developer',
  'docs',
  'connect',
  'flows',
] as const

export type E2ECategory = (typeof E2E_CATEGORIES)[number]

export const E2E_CADENCES = ['always', 'when-feature-touched', 'monthly', 'release'] as const

export type E2ECadence = (typeof E2E_CADENCES)[number]

export const E2E_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const

export type E2EPriority = (typeof E2E_PRIORITIES)[number]

export interface IE2ETestDefinition {
  /** Unique slug — primary lookup key. e.g. "ezauth.login.email-password". */
  testId: string
  app: E2EApp
  /** High-level feature name. e.g. "login" | "dashboard" | "admin". */
  feature: string
  category: E2ECategory
  description: string
  /** App-relative routes exercised. e.g. ['/en/login', '/en/dashboard']. */
  routesExercised: string[]
  /** Glob patterns to match git-changed files. e.g. ['apps/ezauth/web/src/app/[locale]/login/**']. */
  filesExercised: string[]
  cadence: E2ECadence
  priority: E2EPriority
  createdAt: Date
  updatedAt: Date
}

const e2eTestDefinitionSchema = new Schema<IE2ETestDefinition>(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 200,
    },
    app: {
      type: String,
      required: true,
      enum: E2E_APPS,
      index: true,
    },
    feature: {
      type: String,
      required: true,
      maxlength: 100,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: E2E_CATEGORIES,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    routesExercised: {
      type: [String],
      default: [],
    },
    filesExercised: {
      type: [String],
      default: [],
    },
    cadence: {
      type: String,
      required: true,
      enum: E2E_CADENCES,
      default: 'when-feature-touched',
    },
    priority: {
      type: String,
      required: true,
      enum: E2E_PRIORITIES,
      default: 'P1',
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
    collection: 'e2etestdefinitions',
  }
)

// Compound index — matrix view filters by (app, category) frequently.
e2eTestDefinitionSchema.index({ app: 1, category: 1 })
e2eTestDefinitionSchema.index({ priority: 1, app: 1 })

/**
 * Factory function — must be called after `connectToMongo('ezstart')`.
 *
 * @example
 *   const Model = await getE2ETestDefinitionModel()
 *   const list = await Model.find({ app: 'ezauth' })
 */
export async function getE2ETestDefinitionModel(): Promise<Model<IE2ETestDefinition>> {
  const mongoose = await connectToMongo('ezstart')
  return (
    mongoose.models.E2ETestDefinition ||
    mongoose.model<IE2ETestDefinition>('E2ETestDefinition', e2eTestDefinitionSchema)
  )
}
