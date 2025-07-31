import { makeGetListController } from '@ezstart/api-core';
import { Game, GetGamesQuery } from '@ezstart/types';
import { getGamesService } from '../services/getGamesService';

export const getGamesController = makeGetListController<GetGamesQuery, Game>(
  getGamesService,
  'Client'
);
