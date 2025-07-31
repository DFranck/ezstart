// controllers/leaveGameController.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { leaveGameService } from '../services/leaveGameService';

const leaveGameSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
});

export async function leaveGameController(req: Request, res: Response) {
  const parsed = leaveGameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(422)
      .json({ error: 'Validation error', details: parsed.error.errors });
  }

  try {
    const result = await leaveGameService(parsed.data);
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error('[games:leave]', err);
    return res.status(500).json({ error: 'Failed to leave game' });
  }
}
