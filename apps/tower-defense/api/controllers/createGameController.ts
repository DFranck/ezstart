import { makeCreateController } from '@ezstart/api-core';
import { createGameSchema } from '@tower-defense/types/dist/src';
import { createGameService } from '../services/createGameService';

export const createGameController = makeCreateController(
  createGameSchema,
  createGameService,
  'games:create'
);
