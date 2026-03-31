import { registry as getPaymentRegistry, router as getPaymentRouter } from './get.js'
import { registry as listPaymentsRegistry, router as listPaymentsRouter } from './list.js'
import { registry as refundPaymentRegistry, router as refundPaymentRouter } from './refund.js'

export const paymentsRegistries = [getPaymentRegistry, listPaymentsRegistry, refundPaymentRegistry]

export const paymentsRouters = [getPaymentRouter, listPaymentsRouter, refundPaymentRouter]
