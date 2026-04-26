import listUsersRouter, { listUsersRegistry } from './list-users.js'
import getUserRouter, { getUserRegistry } from './get-user.js'
import updateUserRouter, { updateUserRegistry } from './update-user.js'
import deleteUserRouter, { deleteUserRegistry } from './delete-user.js'
import analyticsOverviewRouter, { analyticsOverviewRegistry } from './analytics-overview.js'
import listFeatureFlagsRouter, { listFeatureFlagsRegistry } from './list-feature-flags.js'
import updateFeatureFlagRouter, { updateFeatureFlagRegistry } from './update-feature-flag.js'
import getMaintenanceModeRouter, { getMaintenanceModeRegistry } from './get-maintenance-mode.js'
import updateMaintenanceModeRouter, {
  updateMaintenanceModeRegistry,
} from './update-maintenance-mode.js'

export const adminRegistries = [
  listUsersRegistry,
  getUserRegistry,
  updateUserRegistry,
  deleteUserRegistry,
  analyticsOverviewRegistry,
  listFeatureFlagsRegistry,
  updateFeatureFlagRegistry,
  getMaintenanceModeRegistry,
  updateMaintenanceModeRegistry,
]

export const adminRouters = [
  listUsersRouter,
  getUserRouter,
  updateUserRouter,
  deleteUserRouter,
  analyticsOverviewRouter,
  listFeatureFlagsRouter,
  updateFeatureFlagRouter,
  getMaintenanceModeRouter,
  updateMaintenanceModeRouter,
]
