import { findWithQuery } from '@ezstart/api-core';
import { Game as GameType, GetGamesQuery } from '@ezstart/types';
import { Game } from '../models/Game';

export async function getGamesService(
  query: GetGamesQuery
): Promise<GameType[]> {
  return findWithQuery(Game, query);
}
