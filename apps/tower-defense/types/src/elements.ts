// path: @tower-defense/types/src/elements.ts
// File header: @tower-defense/types/src/elements.ts

import { z, type infer } from 'zod'
import { ELEMENTAL_TYPES } from '@tower-defense/config'

export const elementalTypeSchema = z.enum(ELEMENTAL_TYPES)
export type ElementalType = z.infer<typeof elementalTypeSchema>
