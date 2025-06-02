import { Client, GetClientsQuery } from '@ezstart/types/schemas/client';
import { ClientModel } from '../../models/client';
import { findWithQuery } from '../../utils/mongoose/find-with-query';

export async function getClients(query: GetClientsQuery): Promise<Client[]> {
  return findWithQuery(ClientModel, query);
}
