import { generateMock } from '@anatine/zod-mock'
import { listingQuerySchema, mongoIdSchema, z, type Infer } from '@ezstart/types'
import { GAME_PHASES } from '@tower-defense/config'
import { gamePlayerSchema } from './game-player'
import { towerShopItemSchema } from './tower-shop-item'
import { unitShopItemSchema } from './unit-shop-item'

export const gameSchema = z.object({
  _id: mongoIdSchema,
  host: mongoIdSchema.optional().describe('ID of the host player'),
  players: z.array(gamePlayerSchema).describe('List of players'),
  tick: z.number().describe('Current tick number'),
  map: z.array(z.array(z.string())).describe('2D map representation'),
  shopTowers: z.array(towerShopItemSchema).describe('RNG list of towers'),
  shopUnits: z.array(unitShopItemSchema).describe('Fixed list of units'),
  phase: z.enum(GAME_PHASES).describe('Game phase'),
  createdAt: z.string().describe('ISO timestamp'),
  updatedAt: z.string().describe('ISO timestamp'),
})

export const mockGame = generateMock(gameSchema)
export const mockGames = generateMock(z.array(gameSchema))
export const getGamesQuerySchema = listingQuerySchema.extend({
  phase: z
    .union([
      z.enum(GAME_PHASES).optional().describe('Game phase'),
      z.array(z.enum(GAME_PHASES)).describe('List of game phases'),
    ])
    .optional()
    .describe('Filter by game phase'),
})

export type Game = Infer<typeof gameSchema>
export type GetGamesQuery = Infer<typeof getGamesQuerySchema>
