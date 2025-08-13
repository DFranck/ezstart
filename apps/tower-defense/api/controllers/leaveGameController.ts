import { mongoIdSchema } from '@ezstart/types'
import { Request, Response } from 'express'
import { leaveGameService } from '../services/leaveGameService.js'
import { getIO } from '../socketInstance.js'

export async function leaveGameController(req: Request, res: Response) {
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
    const result = await leaveGameService({
      gameId,
      playerId: playerParsed.data,
    })
    
    // Émettre les événements Socket.IO pour le lobby
    const io = getIO()
    
    // Notifier tous les joueurs du lobby
    io.to(`lobby:${gameId}`).emit('lobby:playerLeft', playerParsed.data)
    
    // Si le jeu a été supprimé, notifier tous les joueurs
    if (result.deleted) {
      io.to(`lobby:${gameId}`).emit('lobby:gameDeleted', { gameId })
    } else if (result.players) {
      // Mettre à jour la liste complète des joueurs
      io.to(`lobby:${gameId}`).emit('lobby:playersUpdated', result.players)
    }
    
    // Événement pour le jeu (si en cours)
    io.to(gameId).emit('playerLeft', result)
    
    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('[games:leave]', err)
    return res.status(500).json({ error: 'Failed to leave game' })
  }
}
