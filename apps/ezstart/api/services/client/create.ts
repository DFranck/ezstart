import { BillingClient, Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';
import { toApiObject } from '../../utils/mongoose/to-api-object';

export async function createClient(data: BillingClient): Promise<Client> {
  const client = new ClientModel(data);
  return toApiObject(client.save());
}
