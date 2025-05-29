import { BillingClient } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function createClient(data: BillingClient) {
  const client = new ClientModel(data);
  return client.save();
}
