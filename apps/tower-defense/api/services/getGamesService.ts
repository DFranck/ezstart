import { findWithQuery } from '@ezstart/api-core'
import { Game, GetGamesQuery } from '@tower-defense/types'
import { GameModel } from '../models/Game'
import { logger } from '@ezstart/ui/lib'

export async function getGamesService(query: GetGamesQuery): Promise<Game[]> {
  logger.debug('getGamesService', query)
  return findWithQuery(GameModel, query)
}
