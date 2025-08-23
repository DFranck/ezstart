// controllers/startGameController.ts
import { Request, Response } from 'express';
import { startGameService } from '../services/startGameService.js';

export async function startGameController(req: Request, res: Response) {
  try {
    const gameId = req.params.id;
    if (!gameId) return res.status(422).json({ error: 'Missing game ID' });
    const result = await startGameService({ gameId });
    return res.status(200).json({
      success: true,
      gameId: result.game._id.toString(),
      phase: result.game.phase,
      startedAt: result.game.updatedAt.toISOString(),
      playersCount: result.activePlayers.length,
    });
  } catch (err) {
    console.error('[games:start]', err);
    return res.status(500).json({ error: 'Failed to start game' });
  }
}
