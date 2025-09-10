import { makeGetByIdController } from '@ezstart/api-core';
import { getGameByIdService } from '../services/getGameByIdService.js';

export const getGameByIdController = makeGetByIdController(
  getGameByIdService,
  'games:getById'
);
