import { ClientModel } from '../../models/client';

export async function getClients() {
  return ClientModel.find({ deletedAt: null });
}
