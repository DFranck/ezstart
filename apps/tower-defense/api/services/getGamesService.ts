import { findWithQuery } from '@ezstart/api-core'
import { logger } from '@ezstart/ui/lib'
import { Game, GetGamesQuery } from '@tower-defense/types'
import { GameModel } from '../models/Game'

export async function getGamesService(query: GetGamesQuery): Promise<Game[]> {
  logger.debug('getGamesService', query)
  return findWithQuery(GameModel, query, {
    populate: ['host', 'players.playerId'],
  })
}
