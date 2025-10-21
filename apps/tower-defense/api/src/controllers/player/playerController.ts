import { logger } from '@ezstart/logger'
import { Request, Response } from 'express'
import { findOrCreatePlayer } from '../../services/player/playerService.js'

export async function createOrFindPlayerController(req: Request, res: Response) {
  logger.debug('createOrFindPlayerController', req.body)
  const { name, userId } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing name' })
  }

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing userId' })
  }

  try {
    const result = await findOrCreatePlayer({ name, userId })
    return res.status(result.isNew ? 201 : 200).json(result)
  } catch (error) {
    console.error('[createOrFindPlayerController] Error:', error)
    console.error('[createOrFindPlayerController] Stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('[createOrFindPlayerController] Body:', { name, userId })
    return res.status(500).json({
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}
