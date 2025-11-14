import listUsersRouter, { listUsersRegistry } from './list-users.js'
import getUserRouter, { getUserRegistry } from './get-user.js'
import updateUserRouter, { updateUserRegistry } from './update-user.js'
import inviteWaitlistRouter, { inviteWaitlistRegistry } from './invite-waitlist.js'
import listWaitlistRouter, { listWaitlistRegistry } from './list-waitlist.js'

export const adminRegistries = [
  listUsersRegistry,
  getUserRegistry,
  updateUserRegistry,
  inviteWaitlistRegistry,
  listWaitlistRegistry
]

export const adminRouters = [
  listUsersRouter,
  getUserRouter,
  updateUserRouter,
  inviteWaitlistRouter,
  listWaitlistRouter
]
