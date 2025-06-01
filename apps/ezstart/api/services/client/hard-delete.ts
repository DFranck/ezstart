import { ClientModel } from '../../models/client';

export async function hardDeleteClient(id: string) {
  return ClientModel.findByIdAndDelete(id);
}
