import { findWithQuery } from '@ezstart/express-core'
import { Game, GetGamesQuery } from '@tower-defense/types'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'

export async function getGamesService(query: GetGamesQuery): Promise<Game[]> {
  const games = (await findWithQuery(GameModel, query, {
    populate: ['host'],
  })) as any[]

  // Pour chaque jeu, récupérer les InGamePlayers avec les détails des joueurs
  const gamesWithPlayers = await Promise.all(
    games.map(async game => {
      const gamePlayers = await InGamePlayerModel.find({ gameId: game._id })
        .populate<{ player: any }>('player')
        .lean()
        .exec()

      return {
        ...game,
        players: gamePlayers.map(gp => ({
          _id: gp._id.toString(),
          gameId: gp.gameId.toString(),
          player: gp.player,
          status: gp.status,
          gold: gp.gold,
          income: gp.income,
          hp: gp.hp,
          hand: gp.hand || [],
          placedTowers: gp.placedTowers || [],
          incomingUnits: gp.incomingUnits || [],
          createdAt: gp.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: gp.updatedAt?.toISOString() || new Date().toISOString(),
        })),
      }
    })
  )

  return gamesWithPlayers as unknown as Game[]
}
