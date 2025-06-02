import { Client } from '@ezstart/types';
import { ClientModel } from '../../models/client';

export async function getClientById(id: string): Promise<Client | null> {
  return ClientModel.findOne({ _id: id, deletedAt: null });
}
