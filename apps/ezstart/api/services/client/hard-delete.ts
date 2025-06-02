import { Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function hardDeleteClient(id: string): Promise<Client | null> {
  return ClientModel.findByIdAndDelete(id);
}
