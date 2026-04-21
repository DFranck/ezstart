import archiveRouter, { archiveApplicationRegistry } from './archive.js'
import createRouter, { createApplicationRegistry } from './create.js'
import getRouter, { getApplicationRegistry } from './get.js'
import listRouter, { listApplicationsRegistry } from './list.js'
import lookupRouter, { lookupApplicationRegistry } from './lookup.js'
import resolveRouter, { resolveApplicationRegistry } from './resolve.js'
import updateRouter, { updateApplicationRegistry } from './update.js'

export const applicationRegistries = [
  createApplicationRegistry,
  listApplicationsRegistry,
  lookupApplicationRegistry,
  resolveApplicationRegistry,
  getApplicationRegistry,
  updateApplicationRegistry,
  archiveApplicationRegistry,
]

/**
 * Order matters — Express routes are matched top-to-bottom. Static paths
 * `/applications/lookup` and `/applications/resolve` must be registered
 * BEFORE the `:id` parametric routes to avoid the catch-all swallowing
 * them.
 */
export const applicationRouters = [
  createRouter,
  listRouter,
  lookupRouter,
  resolveRouter,
  getRouter,
  updateRouter,
  archiveRouter,
]
