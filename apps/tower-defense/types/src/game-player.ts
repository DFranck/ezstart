import { generateMock } from '@anatine/zod-mock'
import { z, type Infer } from '@ezstart/types'
import { DEFAULT_PLAYER_STATUS, PLAYER_STATUS } from '@tower-defense/config'
import { mobSchema } from './mob'
import { placedTowerSchema } from './placedTower'
import { towerSchema } from './tower'

export const gamePlayerSchema = z.object({
  playerId: z.string().describe('Player MongoDB ID'),
  name: z.string().describe('Snapshot of player name'),
  status: z.enum(PLAYER_STATUS).default(DEFAULT_PLAYER_STATUS).describe('Player status'),
  gold: z.number().describe('Current gold'),
  income: z.number().describe('Passive income'),
  hp: z.number().describe('Remaining HP'),
  hand: z.array(towerSchema).describe('Cards in hand'),
  placedTowers: z.array(placedTowerSchema).describe('Towers placed'),
  incomingUnits: z.array(mobSchema).describe('Units sent to this player'),
})

export type GamePlayer = Infer<typeof gamePlayerSchema>
export const mockGamePlayer = generateMock(gamePlayerSchema)
export const mockGamePlayers = generateMock(z.array(gamePlayerSchema))
