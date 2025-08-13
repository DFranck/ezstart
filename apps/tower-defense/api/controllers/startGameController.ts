// controllers/startGameController.ts
import { Request, Response } from 'express';
import { startGameService } from '../services/startGameService.js';

export async function startGameController(req: Request, res: Response) {
  try {
    const gameId = req.params.id;
    if (!gameId) return res.status(422).json({ error: 'Missing game ID' });
    const game = await startGameService({ gameId });
    return res.status(200).json({
      success: true,
      gameId: game._id.toString(),
      phase: game.phase,
      startedAt: game.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('[games:start]', err);
    return res.status(500).json({ error: 'Failed to start game' });
  }
}
