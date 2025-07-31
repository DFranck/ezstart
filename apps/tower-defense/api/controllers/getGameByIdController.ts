import { makeGetByIdController } from '@ezstart/api-core';
import { getGameByIdService } from '../services/getGameByIdService';

export const getGameByIdController = makeGetByIdController(
  getGameByIdService,
  'games:getById'
);
