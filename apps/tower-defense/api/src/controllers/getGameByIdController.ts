import { makeGetByIdController } from '@ezstart/express-core';
import { getGameByIdService } from '../services/getGameByIdService.js';

export const getGameByIdController = makeGetByIdController(
  getGameByIdService,
  'games:getById'
);
