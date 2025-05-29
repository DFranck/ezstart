import { ClientModel } from '../../models/client';

export async function getClientById(id: string) {
  return ClientModel.findOne({ _id: id, deletedAt: null });
}
