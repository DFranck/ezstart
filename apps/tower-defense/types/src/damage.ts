import { z, type Infer } from '@ezstart/types';
import { DAMAGE_TYPES } from '@tower-defense/config';

export const damageTypeSchema = z.enum(DAMAGE_TYPES);
export type DamageType = Infer<typeof damageTypeSchema>;
