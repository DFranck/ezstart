import { registry as createPortalSessionRegistry, router as createPortalSessionRouter } from './createSession.js'

export const portalRegistries = [
  createPortalSessionRegistry,
]

export const portalRouters = [
  createPortalSessionRouter,
]
