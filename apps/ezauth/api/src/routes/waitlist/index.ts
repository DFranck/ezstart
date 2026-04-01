import addRouter, { waitlistAddRegistry } from './add.js'
import listRouter, { waitlistListRegistry } from './list.js'
import checkStatusRouter, { checkStatusRegistry } from './check-status.js'

// NOTE: waitlist/get.ts removed — use admin/get-waitlist.ts instead (same functionality, proper admin middleware)

export const waitlistRegistries = [waitlistAddRegistry, waitlistListRegistry, checkStatusRegistry]

export const waitlistRouters = [addRouter, listRouter, checkStatusRouter]
