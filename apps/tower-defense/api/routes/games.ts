import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/api-core';
import {
  createGameResponseSchema,
  gameSchema,
  paramsMongoIdSchema,
} from '@ezstart/types';
import express from 'express';
import { createGameController } from '../controllers/createGameController';
import { getGameByIdController } from '../controllers/getGameByIdController';
import { joinGameController } from '../controllers/joinGameController';
import { leaveGameController } from '../controllers/leaveGameController';
import { startGameController } from '../controllers/startGameController';

export const gamesRegistry = new OpenAPIRegistry();
const router = express.Router();

const docRouter = createRouterWithDoc(gamesRegistry, router);
docRouter.post('/', createGameController, {
  summary: 'Create a Game',
  tags: ['System'],
  responseSchema: createGameResponseSchema,
});
docRouter.get(
  '/:id',
  validateParams(paramsMongoIdSchema),
  getGameByIdController,
  {
    summary: 'Get a Game',
    tags: ['System'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: gameSchema,
  }
);
docRouter.post(
  '/:id/start',
  validateParams(paramsMongoIdSchema),
  startGameController,
  {
    summary: 'Start a Game',
    tags: ['System'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: gameSchema,
  }
);
docRouter.post(
  '/:id/join',
  validateParams(paramsMongoIdSchema),
  joinGameController,
  {
    summary: 'Join a Game',
    tags: ['System'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: gameSchema,
  }
);
docRouter.post(
  '/:id/leave',
  validateParams(paramsMongoIdSchema),
  leaveGameController,
  {
    summary: 'Leave a Game',
    tags: ['System'],
    paramsSchema: paramsMongoIdSchema,
    responseSchema: gameSchema,
  }
);

export default router;
