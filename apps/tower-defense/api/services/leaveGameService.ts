// services/leaveGameService.ts
import { Game } from '../models/Game';

export async function leaveGameService({ gameId, playerId }: { gameId: string; playerId: string }) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error('Game not found');
  if (game.phase !== 'waiting') throw new Error('Cannot leave an active game');

  game.players = game.players.filter((p) => p.toString() !== playerId);
  await game.save();

  return {
    gameId: game._id.toString(),
    leftAt: new Date().toISOString(),
  };
}
