import addRouter, { waitlistAddRegistry } from './add.js'
import getRouter, { waitlistGetRegistry } from './get.js'
import listRouter, { waitlistListRegistry } from './list.js'

export const waitlistRegistries = [
  waitlistAddRegistry,
  waitlistGetRegistry,
  waitlistListRegistry
]

export const waitlistRouters = [
  addRouter,
  getRouter,
  listRouter
]
