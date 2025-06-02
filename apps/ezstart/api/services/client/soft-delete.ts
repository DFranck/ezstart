import { Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function softDeleteClient(id: string): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(
    id,
    { deletedAt: new Date().toISOString() },
    { new: true }
  );
}
