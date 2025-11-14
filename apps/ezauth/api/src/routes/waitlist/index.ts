import addRouter, { waitlistAddRegistry } from './add.js'
import getRouter, { waitlistGetRegistry } from './get.js'
import listRouter, { waitlistListRegistry } from './list.js'
import checkStatusRouter, { checkStatusRegistry } from './check-status.js'

export const waitlistRegistries = [
  waitlistAddRegistry,
  waitlistGetRegistry,
  waitlistListRegistry,
  checkStatusRegistry
]

export const waitlistRouters = [
  addRouter,
  getRouter,
  listRouter,
  checkStatusRouter
]
