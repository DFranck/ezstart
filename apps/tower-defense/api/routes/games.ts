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

export const gamesRegistry = new OpenAPIRegistry();
const router = express.Router();

const docRouter = createRouterWithDoc(gamesRegistry, router);

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
docRouter.post('/create', createGameController, {
  summary: 'Create a Game',
  tags: ['System'],
  responseSchema: createGameResponseSchema,
});

export default router;
