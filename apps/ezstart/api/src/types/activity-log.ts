/**
 * Activity Log Entry — unified format for the monitoring activity feed.
 *
 * Originally fed by Sentry; Sentry was removed 2026-04-25 (cf. logger README).
 * Type kept to allow future deployment / health / audit sources to feed in.
 */

import { z } from 'zod'

export const ActivityLogSchema = z.object({
  id: z.string(),
  type: z.enum(['error', 'deployment', 'health_change', 'audit_update']),
  severity: z.enum(['critical', 'error', 'warning', 'info', 'success']),
  title: z.string(),
  message: z.string(),
  /** e.g. 'EZAuth API', 'Vercel', 'Railway' */
  source: z.string(),
  project: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  /** Link to deployment / audit entry / etc. */
  url: z.string().optional(),
})

export type ActivityLog = z.infer<typeof ActivityLogSchema>
