import { BaseUser } from './user';

export interface Client extends BaseUser {
  company?: string;
  vatNumber?: string;
  phone?: string;
}
