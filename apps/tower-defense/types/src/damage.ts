import { z, type infer } from 'zod';
import { DAMAGE_TYPES } from '@tower-defense/config';

export const damageTypeSchema = z.enum(DAMAGE_TYPES);
export type DamageType = z.infer<typeof damageTypeSchema>;
