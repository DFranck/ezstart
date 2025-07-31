// controllers/joinGameController.ts
import { mongoIdSchema } from '@ezstart/types';
import { Request, Response } from 'express';
import { joinGameService } from '../services/joinGameService';

export async function joinGameController(req: Request, res: Response) {
  try {
    const parsed = mongoIdSchema.safeParse(req.body?.playerId);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: 'Validation error', details: parsed.error.errors });
    }
    const game = req.params.id;
    if (!game) return res.status(422).json({ error: 'Missing game ID' });
    const result = await joinGameService({
      gameId: game,
      playerId: parsed.data,
    });
    return res.status(200).json({
      success: true,
      ...result, // ex: { playerId, gameId, joinedAt }
    });
  } catch (err) {
    console.error('[games:join]', err);
    return res.status(500).json({ error: 'Failed to join game' });
  }
}
