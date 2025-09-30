import type { InGamePlayer } from '@tower-defense/types'
import { GameModel } from '../models/Game.js'
import { updatePlayerStatsService } from '../services/updatePlayerStatsService.js'
import { getIO } from '../socketInstance.js'
import { ticker } from '../tickers/tickerEngine.js'

export async function checkEndGame(gameId: string) {
  const state = ticker.getState(gameId)
  if (!state) {
    console.log(`[checkEndGame] No ticker state for game ${gameId}`)
    return
  }

  const active = state.players.filter((p: InGamePlayer) => p.status === 'active')

  console.log(`[checkEndGame] Game ${gameId}:`, {
    totalPlayers: state.players.length,
    activePlayers: active.length,
    playerStatuses: state.players.map((p: InGamePlayer) => ({ id: p.player._id || p.player, status: p.status })),
    phase: state.phase
  })

  if (active.length <= 1 && state.phase !== 'finished') {
    console.log(`[game:end] Game ${gameId} finished. Winner:`, active[0]?.player)

    const gameDoc = await GameModel.findById(gameId)
    if (gameDoc) {
      gameDoc.phase = 'finished'
      await gameDoc.save()

      // Calculer les rankings finaux
      const finalRankings = state.players.map((p: InGamePlayer, index: number) => ({
        playerId: p.player._id,
        rank: index + 1,
        status: p.status,
      }))

      // Mettre à jour les stats des joueurs
      await updatePlayerStatsService(finalRankings)

      // Émettre l'événement de fin de game AVANT de détruire la room
      const io = getIO()
      io.to(gameId).emit('gameFinished', {
        gameId,
        winner: active.length === 1 ? active[0] : null,
        finalRankings
      })

      // Émettre aussi un événement global pour mettre à jour la home page
      io.emit('gameEnded', { gameId })
    }

    // Détruire la room ticker APRÈS avoir envoyé les événements
    ticker.destroyRoom(gameId)
  }
}
