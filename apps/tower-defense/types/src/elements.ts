import { z, type Infer } from '@ezstart/types';
import { ELEMENTAL_TYPES } from '@tower-defense/config';

export const elementalTypeSchema = z.enum(ELEMENTAL_TYPES);
export type ElementalType = Infer<typeof elementalTypeSchema>;
