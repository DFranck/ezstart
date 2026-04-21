/**
 * Barrel for EZPay billing routes.
 *
 * Aggregates routers + OpenAPI registries so the parent `routes/index.ts`
 * can mount them under `/billing` with a single pair of iterables.
 *
 * @module apps/ezpay/api/src/routes/billing/index
 */

import portalRouter, { billingPortalRegistry } from './portal.js'

export const billingRegistries = [billingPortalRegistry]

export const billingRouters = [portalRouter]
