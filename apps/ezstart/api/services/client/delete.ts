import { ClientModel } from '../../models/client';

export async function deleteClient(id: string) {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
}
