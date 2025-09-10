import { makeGetListController } from '@ezstart/api-core';
import { Game, GetGamesQuery } from '@tower-defense/types';
import { getGamesService } from '../services/getGamesService.js';

export const getGamesController = makeGetListController<GetGamesQuery, Game>(
  getGamesService,
  'Client'
);
