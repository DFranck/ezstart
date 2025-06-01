import { ClientModel } from '../../models/client';
import { GetClientsQuery } from '../../validators/client/get-clients-query.schema';

export async function getClients({
  includeDeleted,
  deletedOnly,
}: GetClientsQuery) {
  let filter: any = {};
  if (deletedOnly) filter = { deletedAt: { $ne: null } };
  else if (!includeDeleted) filter = { deletedAt: null };
  return ClientModel.find(filter);
}
