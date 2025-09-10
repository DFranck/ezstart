import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'

export async function getGameByIdService(gameId: string) {
  const game = await GameModel.findById(gameId).populate('host').exec()

  if (!game) {
    return null
  }

  // Récupérer les InGamePlayers avec les détails des joueurs
  const gamePlayers = await InGamePlayerModel.find({ gameId }).populate('player').exec()

  // Construire l'objet Game avec les players
  const gameWithPlayers = {
    ...game.toObject(),
    players: gamePlayers.map(gp => ({
      player: gp.player,
      status: gp.status,
      gold: gp.gold,
      income: gp.income,
      hp: gp.hp,
      hand: gp.hand,
      placedTowers: gp.placedTowers,
      incomingUnits: gp.incomingUnits,
    })),
  }

  return gameWithPlayers
}
