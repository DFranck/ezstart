// services/joinGameService.ts
import { mockPlayer } from '@ezstart/types';
import { Game } from '../models/Game';

export async function joinGameService({
  gameId,
  playerId,
}: {
  gameId: string;
  playerId: string;
}) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error('Game not found');
  if (game.phase !== 'waiting') throw new Error('Cannot join an active game');

  // const player = await Player.findById(playerId);
  const player = mockPlayer();
  console.log('playerId', player._id);
  if (!player) throw new Error('Player not found');

  const alreadyJoined = game.players.some((p) => p.toString() === playerId);
  if (alreadyJoined)
    return { gameId, playerId, joinedAt: new Date().toISOString() };

  game.players.push(player._id as any);
  await game.save();

  return {
    gameId: game._id.toString(),
    playerId: player._id.toString(),
    joinedAt: new Date().toISOString(),
  };
}
