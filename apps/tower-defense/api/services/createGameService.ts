import {
  CreateGamePayload,
  CreateGameResponse,
  mockPlayers,
} from '@ezstart/types';
import { Game } from '../models/Game';

export async function createGameService(
  input: CreateGamePayload
): Promise<CreateGameResponse> {
  const players = mockPlayers();
  const playerIds = players.map((p) => p._id);
  const game = await Game.create({
    playerName: input.playerName,
    players: playerIds,
  });

  return {
    gameId: game._id.toString(),
    playerId: game._id.toString(),
    playerName: input.playerName,
    timestamp: game.createdAt.toISOString(),
  };
}
