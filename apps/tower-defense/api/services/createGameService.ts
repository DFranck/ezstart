import {
  CreateGamePayload,
  CreateGameResponse,
  mockPlayer,
} from '@ezstart/types';
import { Game } from '../models/Game';

export async function createGameService(
  input: CreateGamePayload
): Promise<CreateGameResponse> {
  const player = mockPlayer();
  const game = await Game.create({
    playerName: input.playerName,
    players: [player._id],
  });

  return {
    gameId: game._id.toString(),
    playerId: game._id.toString(),
    playerName: input.playerName,
    timestamp: game.createdAt.toISOString(),
  };
}
