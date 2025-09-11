// path: @tower-defense/types/src/elements.ts
// File header: @tower-defense/types/src/elements.ts

import { z, type Infer } from 'zod'
import { ELEMENTAL_TYPES } from '@tower-defense/config'

export const elementalTypeSchema = z.enum(ELEMENTAL_TYPES)
export type ElementalType = Infer<typeof elementalTypeSchema>
