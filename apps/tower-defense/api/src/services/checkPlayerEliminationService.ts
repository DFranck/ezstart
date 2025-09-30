import { logger } from '@ezstart/ui/lib'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { getIO } from '../socketInstance.js'
import { syncTickerWithDatabase } from '../tickers/tickerEngine.js'
import { checkEndGame } from '../utils/checkEndGame.js'
import { updatePlayerStatsService } from './updatePlayerStatsService.js'

/**
 * Vérifie si des joueurs doivent être éliminés (HP <= 0)
 * et met à jour leur statut en 'eliminated'
 */
export async function checkPlayerEliminationService(gameId: string) {
  try {
    // Récupérer tous les joueurs actifs de cette game
    const activePlayers = await InGamePlayerModel.find({
      gameId,
      status: 'active'
    }).populate('player')

    const eliminatedPlayers = []

    for (const inGamePlayer of activePlayers) {
      if (inGamePlayer.hp <= 0) {
        // Marquer comme éliminé
        inGamePlayer.status = 'eliminated'
        await inGamePlayer.save()

        eliminatedPlayers.push({
          playerId: inGamePlayer.player._id,
          playerName: typeof inGamePlayer.player === 'object' ? (inGamePlayer.player as any).name : String(inGamePlayer.player),
          hp: inGamePlayer.hp
        })

        logger.debug(`Player ${typeof inGamePlayer.player === 'object' ? (inGamePlayer.player as any).name : String(inGamePlayer.player)} eliminated (HP: ${inGamePlayer.hp})`)
      }
    }

    if (eliminatedPlayers.length > 0) {
      const io = getIO()

      // Notifier tous les joueurs de la game des éliminations
      for (const eliminated of eliminatedPlayers) {
        io.to(gameId).emit('playerEliminated', {
          gameId,
          playerId: eliminated.playerId,
          playerName: eliminated.playerName,
          reason: 'HP reached zero',
          hp: eliminated.hp
        })
      }

      // Synchroniser le ticker avec les nouvelles données DB avant checkEndGame
      await syncTickerWithDatabase(gameId)

      // Vérifier si la game doit se terminer APRÈS sync
      await checkEndGame(gameId)
    }

    return eliminatedPlayers
  } catch (error) {
    logger.error('Error in checkPlayerEliminationService:', error)
    return []
  }
}