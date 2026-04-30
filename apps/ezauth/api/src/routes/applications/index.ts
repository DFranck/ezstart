import archiveRouter, { archiveApplicationRegistry } from './archive.js'
import createRouter, { createApplicationRegistry } from './create.js'
import getRouter, { getApplicationRegistry } from './get.js'
import listRouter, { listApplicationsRegistry } from './list.js'
import lookupRouter, { lookupApplicationRegistry } from './lookup.js'
import regenerateWebhookSecretRouter, {
  regenerateWebhookSecretRegistry,
} from './regenerate-webhook-secret.js'
import resolveRouter, { resolveApplicationRegistry } from './resolve.js'
import updateRouter, { updateApplicationRegistry } from './update.js'
import updateThemeRouter, { updateApplicationThemeRegistry } from './update-theme.js'

export const applicationRegistries = [
  createApplicationRegistry,
  listApplicationsRegistry,
  lookupApplicationRegistry,
  resolveApplicationRegistry,
  getApplicationRegistry,
  updateApplicationRegistry,
  updateApplicationThemeRegistry,
  regenerateWebhookSecretRegistry,
  archiveApplicationRegistry,
]

/**
 * Order matters — Express routes are matched top-to-bottom. Static paths
 * `/applications/lookup` and `/applications/resolve` must be registered
 * BEFORE the `:id` parametric routes to avoid the catch-all swallowing
 * them.
 *
 * `update-theme` registers `PATCH /applications/:id/theme` — it shares the
 * same `:id` prefix as `update`, but Express matches the more specific
 * suffix (`/theme`) when the path segments match, so ordering between them
 * is safe. Same logic for `regenerate-webhook-secret` (POST `/:id/regenerate-webhook-secret`).
 */
export const applicationRouters = [
  createRouter,
  listRouter,
  lookupRouter,
  resolveRouter,
  getRouter,
  updateThemeRouter,
  regenerateWebhookSecretRouter,
  updateRouter,
  archiveRouter,
]
