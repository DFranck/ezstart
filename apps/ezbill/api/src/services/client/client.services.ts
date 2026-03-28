import { BillingClient, Client, GetClientsQuery } from '@ezbill/types';
import { getClientModel } from '../../models/client.js';
import { findWithQuery, findWithQueryPaginated, PaginatedResult } from '../../utils/mongoose/find-with-query.js';
import { toApiObject } from '../../utils/mongoose/to-api-object.js';

export async function createClientService(
  data: BillingClient
): Promise<Client> {
  const ClientModel = await getClientModel();
  const client = new ClientModel(data);
  const savedClient = await client.save();
  return toApiObject(savedClient);
}

export async function getClientByIdService(
  id: string,
  userId?: string
): Promise<Client | null> {
  const ClientModel = await getClientModel();
  const filter: any = { _id: id, deletedAt: null };
  if (userId) {
    filter.userId = userId;
  }
  const doc = await ClientModel.findOne(filter);
  return doc ? toApiObject(doc) : null;
}

export async function getClientsService(
  query: GetClientsQuery & { includeDeleted?: boolean; deletedOnly?: boolean; userId?: string }
): Promise<Client[]> {
  const ClientModel = await getClientModel();
  const baseQuery = { ...query };
  delete baseQuery.includeDeleted;
  // Don't delete deletedOnly - let findWithQuery handle it

  const docs = await findWithQuery(ClientModel, baseQuery);
  return docs.map(toApiObject);
}

export async function getClientsPaginatedService(
  query: GetClientsQuery & { includeDeleted?: boolean; deletedOnly?: boolean; userId?: string }
): Promise<PaginatedResult<Client>> {
  const ClientModel = await getClientModel();
  const baseQuery = { ...query };
  delete baseQuery.includeDeleted;

  return findWithQueryPaginated(ClientModel, baseQuery);
}

export async function hardDeleteClientService(
  id: string,
  userId?: string
): Promise<Client | null> {
  const ClientModel = await getClientModel();
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
  const ClientModel = await getClientModel();
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
  const ClientModel = await getClientModel();
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  return ClientModel.findOneAndUpdate(
    filter,
    {
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    { new: true }
  );
}

export async function updateClientService(
  id: string,
  data: Partial<BillingClient>,
  userId?: string
): Promise<Client | null> {
  const ClientModel = await getClientModel();
  const filter: any = { _id: id };
  if (userId) {
    filter.userId = userId;
  }
  const doc = await ClientModel.findOneAndUpdate(filter, data, { new: true });
  return doc ? toApiObject(doc) : null;
}
