import listUsersRouter, { listUsersRegistry } from './list-users.js'
import getUserRouter, { getUserRegistry } from './get-user.js'
import updateUserRouter, { updateUserRegistry } from './update-user.js'

export const adminRegistries = [
  listUsersRegistry,
  getUserRegistry,
  updateUserRegistry
]

export const adminRouters = [
  listUsersRouter,
  getUserRouter,
  updateUserRouter
]
