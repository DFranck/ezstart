import { registry as onboardRegistry, router as onboardRouter } from './onboard.js'
import { router as callbackRouter } from './callback.js'
import { registry as statusRegistry, router as statusRouter } from './status.js'
import {
  registry as dashboardLinkRegistry,
  router as dashboardLinkRouter,
} from './dashboard-link.js'

export const connectRegistries = [onboardRegistry, statusRegistry, dashboardLinkRegistry]

export const connectRouters = [onboardRouter, callbackRouter, statusRouter, dashboardLinkRouter]
