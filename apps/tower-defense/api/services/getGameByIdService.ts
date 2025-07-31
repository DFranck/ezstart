import { Game } from '../models/Game';

export async function getGameByIdService(gameId: string) {
  const game = await Game.findById(gameId);
  return game;
}
