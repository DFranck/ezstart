import { ZONE_HEIGHT, ZONE_WIDTH } from '@tower-defense/config';
import { mockShopItems } from '@tower-defense/types';
import { Types } from 'mongoose';
import { Game } from '../models/Game';

export async function startGameService({ gameId }: { gameId: string }) {
  const game = await Game.findById(gameId);
  if (!game) throw new Error('Game not found');
  if (game.phase !== 'waiting') throw new Error('Game already started');

  game.phase = 'playing';
  game.tick = 0;

  game.set(
    'map',
    Array.from({ length: ZONE_HEIGHT }, () => Array(ZONE_WIDTH).fill('grass'))
  );

  game.set(
    'shop',
    (mockShopItems as any[]).map((item) => ({
      ...item,
      tower:
        item.type === 'tower'
          ? { ...item.tower, _id: new Types.ObjectId() }
          : undefined,
      unit:
        item.type === 'unit'
          ? { ...item.unit, _id: new Types.ObjectId() }
          : undefined,
    }))
  );

  game.updatedAt = new Date();

  await game.save();
  return game;
}
