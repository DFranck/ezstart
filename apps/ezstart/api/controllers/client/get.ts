import { Client, GetClientsQuery } from '@ezstart/types/dist/schemas/client';
import { getClients } from '../../services';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';

export const getClientsController = makeGetListController<
  GetClientsQuery,
  Client
>(getClients, 'getClientsController');
