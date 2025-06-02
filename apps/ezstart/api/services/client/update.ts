import { BillingClient, Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function updateClient(
  id: string,
  data: Partial<BillingClient>
): Promise<Client | null> {
  return ClientModel.findByIdAndUpdate(id, data, { new: true });
}
