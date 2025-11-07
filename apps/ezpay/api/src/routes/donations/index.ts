import { registry as createDonationRegistry, router as createDonationRouter } from './create.js'
import { registry as listDonationsRegistry, router as listDonationsRouter } from './list.js'
import { registry as donationStatsRegistry, router as donationStatsRouter } from './stats.js'
import { registry as verifyPaymentRegistry, router as verifyPaymentRouter } from './verify.js'

export const donationsRegistries = [
  createDonationRegistry,
  listDonationsRegistry,
  donationStatsRegistry,
  verifyPaymentRegistry,
]

export const donationsRouters = [
  createDonationRouter,
  listDonationsRouter,
  donationStatsRouter,
  verifyPaymentRouter,
]
