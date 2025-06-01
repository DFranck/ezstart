import { ClientModel } from '../../models/client';

export async function softDeleteClient(id: string) {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
}
