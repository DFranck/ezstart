import { mongoIdSchema } from '@ezstart/types'
import { Request, Response } from 'express'
import { leaveLobbyService } from '../services/leaveLobbyService'

export async function leaveLobbyController(req: Request, res: Response) {
  const playerParsed = mongoIdSchema.safeParse(req.body?.playerId)
  if (!playerParsed.success) {
    return res.status(422).json({
      error: 'Validation error',
      details: playerParsed.error.errors,
    })
  }

  const gameId = req.params.id
  if (!gameId) return res.status(422).json({ error: 'Missing game ID' })

  try {
    const result = await leaveLobbyService({
      gameId,
      playerId: playerParsed.data,
    })
    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[games:leave]', err)
    return res.status(500).json({ error: 'Failed to leave game' })
  }
}
