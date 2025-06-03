import { Client, GetClientsQuery } from '@ezstart/types/dist/schemas/client';
import { billingClientSchema } from '@ezstart/types/schemas/client';
import {
  createClientService,
  getClientByIdService,
  getClientsService,
  hardDeleteClientService,
  restoreClientService,
  softDeleteClientService,
  updateClientService,
} from '../../services/client';
import { makeCreateController } from '../../utils/controller-factory/make-create-controller';
import { makeDeleteController } from '../../utils/controller-factory/make-delete-controller';
import { makeGetByIdController } from '../../utils/controller-factory/make-get-by-id-controller';
import { makeGetListController } from '../../utils/controller-factory/make-get-list-controller';
import { makeRestoreController } from '../../utils/controller-factory/make-restore-controller';
import { makeUpdateController } from '../../utils/controller-factory/make-update-controller';

export const createClientController = makeCreateController(
  billingClientSchema,
  createClientService,
  'Client'
);

export const getClientByIdController = makeGetByIdController(
  getClientByIdService,
  'Client'
);

export const getClientsController = makeGetListController<
  GetClientsQuery,
  Client
>(getClientsService, 'Client');

export const hardDeleteClientController = makeDeleteController(
  hardDeleteClientService,
  'Client',
  { statusCode: 200, sendBody: true }
);

export const restoreClientController = makeRestoreController(
  restoreClientService,
  'Client'
);

export const softDeleteClientController = makeDeleteController(
  softDeleteClientService,
  'Client'
);

export const updateClientController = makeUpdateController(
  billingClientSchema,
  updateClientService,
  'Client'
);
