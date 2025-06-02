import { Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function restoreClient(id: string): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: null, updatedAt: new Date().toISOString() },
    { new: true }
  );
}
