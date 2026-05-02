/**
 * EZPay Connect — Three payment modes
 *
 * 1. Direct: No connect params. Payment goes to the platform's own Stripe account.
 *    Use case: platform sells its own products/services.
 *
 * 2. Platform (Standard account): `type: 'standard'` at onboarding.
 *    The connected user has a full Stripe dashboard and manages their own account.
 *    Use case: SaaS where developers/merchants already have Stripe expertise.
 *
 * 3. Marketplace (Express account): `type: 'express'` at onboarding.
 *    Stripe handles KYC and provides a simplified dashboard via createLoginLink().
 *    Use case: marketplace sellers who need minimal Stripe interaction.
 */
import { registry as onboardRegistry, router as onboardRouter } from './onboard.js'
import { router as callbackRouter } from './callback.js'
import { registry as statusRegistry, router as statusRouter } from './status.js'
import {
  registry as dashboardLinkRegistry,
  router as dashboardLinkRouter,
} from './dashboard-link.js'
import { registry as convertRegistry, router as convertRouter } from './convert.js'
import { registry as resumeRegistry, router as resumeRouter } from './resume.js'
import { registry as disconnectRegistry, router as disconnectRouter } from './disconnect.js'

export const connectRegistries = [
  onboardRegistry,
  statusRegistry,
  dashboardLinkRegistry,
  convertRegistry,
  resumeRegistry,
  disconnectRegistry,
]

export const connectRouters = [
  onboardRouter,
  callbackRouter,
  statusRouter,
  dashboardLinkRouter,
  convertRouter,
  resumeRouter,
  disconnectRouter,
]
