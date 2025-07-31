// controllers/joinGameController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { joinGameService } from '../services/joinGameService';

const joinGameSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});

export async function joinGameController(req: Request, res: Response) {
  const parsed = joinGameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: 'Validation error', details: parsed.error.errors });
  }

  try {
    const result = await joinGameService(parsed.data);
    return res.status(200).json({
      success: true,
      ...result, // ex: { playerId, gameId, joinedAt }
    });
  } catch (err) {
    console.error('[games:join]', err);
    return res.status(500).json({ error: 'Failed to join game' });
  }
}
