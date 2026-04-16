/**
 * Middleware to authenticate requests using API keys.
 * Checks `X-API-Key` header or `Authorization: ApiKey <key>`.
 */

import type { Request, Response, NextFunction } from 'express'
import { sendError } from '@ezstart/api-core'
import { getApiKeyModel } from '../models/api-key.js'
import { hashApiKey } from '../utils/api-key.js'
import { logger } from '@ezstart/logger/server'

/** Extract the raw API key from request headers. */
function extractApiKey(req: Request): string | undefined {
  const xApiKey = req.headers['x-api-key']
  if (typeof xApiKey === 'string' && xApiKey.length > 0) {
    return xApiKey
  }

  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('ApiKey ')) {
    return authHeader.substring(7)
  }

  return undefined
}

/**
 * Middleware that validates an API key and attaches the key info to the request.
 * Sets `req.apiKeyId` and `req.apiKeyUserId` on success.
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const rawKey = extractApiKey(req)
    if (!rawKey) {
      return sendError(res, 'API key required', 401)
    }

    const hashedKey = hashApiKey(rawKey)
    const ApiKey = await getApiKeyModel()

    const apiKey = await ApiKey.findOne({ key: hashedKey }).lean()
    if (!apiKey) {
      return sendError(res, 'Invalid API key', 401)
    }

    if (apiKey.status !== 'active') {
      return sendError(res, 'API key has been revoked', 401)
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return sendError(res, 'API key has expired', 401)
    }

    // Attach API key info to request
    req.apiKeyId = apiKey._id.toString()
    req.apiKeyUserId = apiKey.userId

    // Fire-and-forget: update lastUsedAt
    ApiKey.updateOne(
      { _id: apiKey._id },
      { $set: { lastUsedAt: new Date() } }
    ).catch((err: unknown) => {
      logger.warn('Failed to update API key lastUsedAt:', err)
    })

    next()
  } catch (error: unknown) {
    logger.error('API key middleware error:', error)
    return sendError(res, 'API key authentication failed', 500)
  }
}
