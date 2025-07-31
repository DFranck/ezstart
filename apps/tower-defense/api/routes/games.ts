import { createRouterWithDoc, OpenAPIRegistry } from '@ezstart/api-core';
import { createGameResponseSchema } from '@ezstart/types';
import express from 'express';
import { createGameController } from '../controllers/createGameController';

export const gamesRegistry = new OpenAPIRegistry();
const router = express.Router();

const docRouter = createRouterWithDoc(gamesRegistry, router);

docRouter.get('/create', createGameController, {
  summary: 'Test route',
  tags: ['System'],
  responseSchema: createGameResponseSchema,
});

export default router;
