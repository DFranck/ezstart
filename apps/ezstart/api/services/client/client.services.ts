import {
  BillingClient,
  Client,
  GetClientsQuery,
} from '@ezstart/types/schemas/client';
import { ClientModel } from '../../models/client';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createClientService(
  data: BillingClient
): Promise<Client> {
  const client = new ClientModel(data);
  return toApiObject(client.save());
}

export async function getClientByIdService(id: string): Promise<Client | null> {
  return ClientModel.findOne({ _id: id, deletedAt: null });
}

export async function getClientsService(
  query: GetClientsQuery
): Promise<Client[]> {
  return findWithQuery(ClientModel, query);
}

export async function hardDeleteClientService(
  id: string
): Promise<Client | null> {
  return ClientModel.findByIdAndDelete(id);
}

export async function restoreClientService(id: string): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: null, updatedAt: new Date().toISOString() },
    { new: true }
  );
}

export async function softDeleteClientService(
  id: string
): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
}

export async function updateClientService(
  id: string,
  data: Partial<BillingClient>
): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(id, data, { new: true });
}
