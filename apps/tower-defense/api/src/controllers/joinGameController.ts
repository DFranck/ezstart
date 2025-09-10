import { mongoIdSchema } from '@ezstart/types'
import { Request, Response } from 'express'
import { joinGameService } from '../services/joinGameService.js'
import { getIO } from '../socketInstance.js'

export async function joinGameController(req: Request, res: Response) {
  try {
    const parsed = mongoIdSchema.safeParse(req.body?.playerId)
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation error', details: parsed.error.errors })
    }

    const gameId = req.params.id
    const playerId = parsed.data
    if (!gameId) return res.status(422).json({ error: 'Missing game ID' })

    const result = await joinGameService({ gameId, playerId })

    // Émettre les événements Socket.IO pour le lobby
    const io = getIO()
    
    // Notifier tous les joueurs du lobby
    io.to(`lobby:${gameId}`).emit('lobby:playerJoined', {
      _id: playerId,
      name: result.playerName || `Player ${playerId.slice(0, 6)}`
    })
    
    // Mettre à jour la liste complète des joueurs
    io.to(`lobby:${gameId}`).emit('lobby:playersUpdated', result.players)
    
    // Événement pour le jeu (si déjà en cours)
    io.to(gameId).emit('playerJoined', result)

    return res.status(200).json({
      success: true,
      ...result,
    })
  } catch (err) {
    console.error('[games:join]', err)
    return res.status(500).json({ error: 'Failed to join game' })
  }
}
