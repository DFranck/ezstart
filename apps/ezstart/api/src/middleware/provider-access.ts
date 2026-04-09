import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/express-core'
import { isAppAuthorizedForProvider } from '../services/provider-access.service.js'

/**
 * Middleware to check if appName has access to the requested providerId.
 * Expects req.body.appName and req.body.providerId.
 * If either is missing, skips check (allows other validation to catch it).
 */
export async function checkProviderAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { appName, providerId } = req.body as { appName?: string; providerId?: string }
  if (!appName || !providerId) {
    next()
    return
  }

  const authorized = await isAppAuthorizedForProvider(appName, providerId)
  if (!authorized) {
    sendError(
      res,
      `App "${appName}" is not authorized to use provider "${providerId}". Contact superadmin.`,
      403
    )
    return
  }
  next()
}
