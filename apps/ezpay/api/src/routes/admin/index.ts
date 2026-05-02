import {
  registry as analyticsOverviewRegistry,
  router as analyticsOverviewRouter,
} from './analytics-overview.js'
import {
  registry as payDocsDemoResetRegistry,
  router as payDocsDemoResetRouter,
} from './pay-docs-demo-reset.js'

export const adminRegistries = [analyticsOverviewRegistry, payDocsDemoResetRegistry]

export const adminRouters = [analyticsOverviewRouter, payDocsDemoResetRouter]
