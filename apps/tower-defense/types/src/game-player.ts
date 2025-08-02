import { generateMock } from '@anatine/zod-mock'
import { z, type Infer } from '@ezstart/types'
import { mobSchema } from './mob'
import { towerSchema } from './tower'

export const gamePlayerSchema = z.object({
  playerId: z.string().describe('Player MongoDB ID'),
  name: z.string().describe('Snapshot of player name'),
  gold: z.number().describe('Current gold'),
  income: z.number().describe('Passive income'),
  hp: z.number().describe('Remaining HP'),
  hand: z.array(towerSchema).describe('Cards in hand'),
  placedTowers: z.array(towerSchema).describe('Towers placed'),
  incomingUnits: z.array(mobSchema).describe('Units sent to this player'),
})

export type GamePlayer = Infer<typeof gamePlayerSchema>
export const mockGamePlayer = generateMock(gamePlayerSchema)
export const mockGamePlayers = generateMock(z.array(gamePlayerSchema))
