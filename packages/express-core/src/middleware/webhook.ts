import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { sendError } from '../helpers/api-response.js'

/**
 * Create a webhook signature verification middleware.
 * Verifies HMAC-SHA256 signature from a header against the raw body.
 */
export function createWebhookVerifier(options: {
  secret: string
  headerName?: string // default: 'x-webhook-signature'
  algorithm?: string // default: 'sha256'
}) {
  const { secret, headerName = 'x-webhook-signature', algorithm = 'sha256' } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers[headerName.toLowerCase()] as string | undefined
    if (!signature) {
      return sendError(res, 'Missing webhook signature', 401)
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    const expected = crypto.createHmac(algorithm, secret).update(rawBody).digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return sendError(res, 'Invalid webhook signature', 401)
    }

    next()
  }
}
