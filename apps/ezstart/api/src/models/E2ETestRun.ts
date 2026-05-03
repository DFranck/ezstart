/**
 * E2E Test Run model — append-only log of every individual E2E test execution.
 *
 * Each run references an `E2ETestDefinition` via `testId`. Indexed for fast
 * "latest run per test" + time-range queries.
 *
 * Collection: `e2etestruns` (explicit name).
 *
 * See `.claude/rules/standard-saas.md` + `mongodb.md` for factory pattern.
 */

import { connectToMongo } from '@ezstart/api-core'
import { Schema, type Model } from 'mongoose'

export const E2E_RUN_STATUSES = ['pass', 'fail', 'skip', 'blocked'] as const

export type E2ERunStatus = (typeof E2E_RUN_STATUSES)[number]

export interface IE2ETestRun {
  /** FK → E2ETestDefinition.testId. */
  testId: string
  status: E2ERunStatus
  runAt: Date
  /** Run duration in milliseconds. Optional — not always measured. */
  durationMs?: number | null
  /** Identifier for the agent/runner. e.g. 'mcp-chrome-devtools' | 'curl' | 'manual'. */
  agent: string
  agentVersion?: string | null
  /** Error messages when status === 'fail'. */
  errors?: string[]
  notes?: string | null
  /** git rev-parse HEAD when run executed. */
  fileSnapshotSha?: string | null
  /** userId or 'cron'. */
  triggeredBy?: string | null
  createdAt: Date
  updatedAt: Date
}

const e2eTestRunSchema = new Schema<IE2ETestRun>(
  {
    testId: {
      type: String,
      required: true,
      maxlength: 200,
    },
    status: {
      type: String,
      required: true,
      enum: E2E_RUN_STATUSES,
    },
    runAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    durationMs: {
      type: Number,
      default: null,
      min: 0,
    },
    agent: {
      type: String,
      required: true,
      maxlength: 100,
    },
    agentVersion: {
      type: String,
      default: null,
      maxlength: 100,
    },
    errors: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: null,
      maxlength: 4000,
    },
    fileSnapshotSha: {
      type: String,
      default: null,
      maxlength: 64,
    },
    triggeredBy: {
      type: String,
      default: null,
      maxlength: 100,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
    collection: 'e2etestruns',
    // `errors` is a reserved Mongoose path name — we explicitly opt-in to use
    // it because the alternative (`errorMessages`, `failures`) leaks Mongoose
    // jargon into our public API. The override only suppresses the warning.
    suppressReservedKeysWarning: true,
  }
)

// Compound index — "latest run per test" is the dominant query.
e2eTestRunSchema.index({ testId: 1, runAt: -1 })
// Time-range scans (e.g. "all runs last 24h") + status filters.
e2eTestRunSchema.index({ runAt: -1 })
e2eTestRunSchema.index({ status: 1, runAt: -1 })

/**
 * Factory function — must be called after `connectToMongo('ezstart')`.
 *
 * @example
 *   const Model = await getE2ETestRunModel()
 *   await Model.create({ testId, status: 'pass', agent: 'curl' })
 */
export async function getE2ETestRunModel(): Promise<Model<IE2ETestRun>> {
  const mongoose = await connectToMongo('ezstart')
  return mongoose.models.E2ETestRun || mongoose.model<IE2ETestRun>('E2ETestRun', e2eTestRunSchema)
}
