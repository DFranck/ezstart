/**
 * DELETE /api/config/:gameType/:layoutName — Delete a layout
 */

import { logger } from '@ezstart/logger/server'
import { Router, sendSuccess, sendError } from '@ezstart/api-core'
import { findOneAndDelete } from '../utils/mongoose-query.js'
import type { Router as ExpressRouter } from 'express'
import { getGameConfigModel } from '../models/game-config.js'

const router: ExpressRouter = Router()

router.delete('/:gameType/:layoutName', async (req, res) => {
  try {
    const { gameType, layoutName } = req.params

    if (!gameType || !layoutName) {
      return sendError(res, 'gameType and layoutName are required', 400)
    }

    const GameConfig = await getGameConfigModel()

    const config = await findOneAndDelete(GameConfig, { gameType, layoutName }).exec()

    if (!config) {
      return sendError(res, 'Layout not found', 404)
    }

    return sendSuccess(res, { deleted: true })
  } catch (error) {
    logger.error('[delete-game-config] Error:', error)
    return sendError(res, 'Failed to delete layout')
  }
})

export default router
