import { registry as createPlanRegistry, router as createPlanRouter } from './createPlan.js'
import { registry as listPlansRegistry, router as listPlansRouter } from './listPlans.js'
import { registry as updatePlanRegistry, router as updatePlanRouter } from './updatePlan.js'
import { registry as deletePlanRegistry, router as deletePlanRouter } from './deletePlan.js'

export const plansRegistries = [
  createPlanRegistry,
  listPlansRegistry,
  updatePlanRegistry,
  deletePlanRegistry,
]

export const plansRouters = [
  createPlanRouter,
  listPlansRouter,
  updatePlanRouter,
  deletePlanRouter,
]
