import listUsersRouter, { listUsersRegistry } from './list-users.js'
import getUserRouter, { getUserRegistry } from './get-user.js'
import updateUserRouter, { updateUserRegistry } from './update-user.js'
import inviteWaitlistRouter, { inviteWaitlistRegistry } from './invite-waitlist.js'
import listWaitlistRouter, { listWaitlistRegistry } from './list-waitlist.js'
import getWaitlistRouter, { getWaitlistRegistry } from './get-waitlist.js'
import deleteUserRouter, { deleteUserRegistry } from './delete-user.js'

export const adminRegistries = [
  listUsersRegistry,
  getUserRegistry,
  updateUserRegistry,
  deleteUserRegistry,
  inviteWaitlistRegistry,
  listWaitlistRegistry,
  getWaitlistRegistry,
]

export const adminRouters = [
  listUsersRouter,
  getUserRouter,
  updateUserRouter,
  deleteUserRouter,
  inviteWaitlistRouter,
  listWaitlistRouter,
  getWaitlistRouter,
]
