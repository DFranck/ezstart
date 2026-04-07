import { registry as getPaymentRegistry, router as getPaymentRouter } from './get.js'
import { registry as listPaymentsRegistry, router as listPaymentsRouter } from './list.js'
import { registry as myPaymentsRegistry, router as myPaymentsRouter } from './me.js'
import { registry as refundPaymentRegistry, router as refundPaymentRouter } from './refund.js'
import { registry as cleanupPaymentsRegistry, router as cleanupPaymentsRouter } from './cleanup.js'

export const paymentsRegistries = [
  getPaymentRegistry,
  listPaymentsRegistry,
  myPaymentsRegistry,
  refundPaymentRegistry,
  cleanupPaymentsRegistry,
]

export const paymentsRouters = [
  cleanupPaymentsRouter,
  myPaymentsRouter,
  getPaymentRouter,
  listPaymentsRouter,
  refundPaymentRouter,
]
