import { BillingClient } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function updateClient(id: string, data: Partial<BillingClient>) {
  return ClientModel.findByIdAndUpdate(id, data, { new: true });
}
