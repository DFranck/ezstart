import express from 'express';
export const createGameController = (
  req: express.Request,
  res: express.Response
) => {
  const { playerName } = req.body;

  res.json({
    gameId: 'abc123',
    playerId: 'p1',
    playerName,
    timestamp: new Date().toISOString(),
  });
};
