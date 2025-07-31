import { CreateGamePayload, CreateGameResponse } from '@ezstart/types';
import { Game } from '../models/Game';

export async function createGameService(
  input: CreateGamePayload
): Promise<CreateGameResponse> {
  const game = await Game.create({
    playerName: input.playerName,
    players: [],
  });

  return {
    gameId: game._id.toString(),
    playerId: game._id.toString(),
    playerName: input.playerName,
    timestamp: game.createdAt.toISOString(),
  };
}
