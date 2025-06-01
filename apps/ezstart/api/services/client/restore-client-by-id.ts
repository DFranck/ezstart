import { ClientModel } from '../../models/client';

export async function restoreClient(id: string) {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: null, updatedAt: new Date().toISOString() },
    { new: true }
  );
}
