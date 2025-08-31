import { BillingClient, Client, GetClientsQuery } from '@ez-billing/types';
import { ClientModel } from '../../models/client';
import { findWithQuery } from '../../utils/mongoose/find-with-query';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createClientService(
  data: BillingClient
): Promise<Client> {
  const client = new ClientModel(data);
  const savedClient = await client.save();
  return toApiObject(savedClient);
}

export async function getClientByIdService(
  id: string, 
  userId?: string
): Promise<Client | null> {
  const filter: any = { _id: id, deletedAt: null };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOne(filter);
}

export async function getClientsService(
  query: GetClientsQuery & { includeDeleted?: boolean; deletedOnly?: boolean; userId?: string }
): Promise<Client[]> {
  let deletedAtFilter = {};
  
  if (query.deletedOnly === true) {
    deletedAtFilter = { deletedAt: { $ne: null } };
  } else if (query.includeDeleted !== true) {
    deletedAtFilter = { deletedAt: null };
  }
  
  const baseQuery = { ...query };
  delete baseQuery.includeDeleted;
  delete baseQuery.deletedOnly;
  
  const docs = await findWithQuery(ClientModel, baseQuery, deletedAtFilter);
  return docs.map(toApiObject);
}

export async function hardDeleteClientService(
  id: string,
  userId?: string
): Promise<Client | null> {
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOneAndDelete(filter);
}

export async function restoreClientService(
  id: string,
  userId?: string
): Promise<Client | null> {
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOneAndUpdate(
    filter,
    { deletedAt: null, updatedAt: new Date().toISOString() },
    { new: true }
  );
}

export async function softDeleteClientService(
  id: string,
  userId?: string
): Promise<Client | null> {
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOneAndUpdate(
    filter,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
}

export async function updateClientService(
  id: string,
  data: Partial<BillingClient>,
  userId?: string
): Promise<Client | null> {
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOneAndUpdate(filter, data, { new: true });
}
