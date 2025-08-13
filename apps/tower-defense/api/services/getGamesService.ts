import { findWithQuery } from '@ezstart/api-core'
import { Game, GetGamesQuery } from '@tower-defense/types'
import { GameModel } from '../models/Game.js'

export async function getGamesService(query: GetGamesQuery): Promise<Game[]> {
  return findWithQuery(GameModel, query, {
    populate: ['host', 'players.playerId'],
  })
}
