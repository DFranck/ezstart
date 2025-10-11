import { generateMock } from '@anatine/zod-mock'
import { z, type infer } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { mobSchema } from './mob.js'
import { positionSchema } from './position.js'

/**
 * ActiveMob - Runtime state for a mob instance
 *
 * OPTIMIZED: Uses mobTypeId reference instead of embedding full Mob object.
 * Reduces size from ~320 bytes to ~120 bytes (62% smaller).
 */
export const activeMobSchema = z.object({
  id: mongoIdSchema.describe('Unique ID for this active mob instance'),
  mobTypeId: mongoIdSchema.describe('Reference to MobType definition'),
  currentHp: z.number().describe('Current health points'),
  position: z.object({
    x: z.number().describe('Current x position (can be fractional)'),
    y: z.number().describe('Current y position (can be fractional)')
  }).describe('Current position on the map'),
  pathIndex: z.number().describe('Current index in the path array'),
  targetPlayerId: mongoIdSchema.describe('Player this mob is targeting'),
  // RTS-style persistent offset for visual separation
  pathOffset: z.object({
    x: z.number().describe('Persistent X offset from path waypoints'),
    y: z.number().describe('Persistent Y offset from path waypoints')
  }).optional().describe('Offset applied to all waypoints for visual variety'),
})

export type ActiveMob = z.infer<typeof activeMobSchema>

// Legacy schema for backward compatibility during migration
export const activeMobLegacySchema = activeMobSchema.extend({
  mob: mobSchema.optional().describe('DEPRECATED: Use mobTypeId instead'),
})

export type ActiveMobLegacy = z.infer<typeof activeMobLegacySchema>

export const mockActiveMob = generateMock(activeMobSchema)
export const mockActiveMobs = generateMock(z.array(activeMobSchema))