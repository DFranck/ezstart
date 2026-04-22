import {
  registry as createSubscriptionRegistry,
  router as createSubscriptionRouter,
} from './create.js'
import { registry as listSubscriptionsRegistry, router as listSubscriptionsRouter } from './list.js'
import {
  registry as cancelSubscriptionRegistry,
  router as cancelSubscriptionRouter,
} from './cancel.js'
import { registry as changePlanRegistry, router as changePlanRouter } from './change-plan.js'

export const subscriptionsRegistries = [
  createSubscriptionRegistry,
  listSubscriptionsRegistry,
  cancelSubscriptionRegistry,
  changePlanRegistry,
]

export const subscriptionsRouters = [
  createSubscriptionRouter,
  listSubscriptionsRouter,
  cancelSubscriptionRouter,
  changePlanRouter,
]
