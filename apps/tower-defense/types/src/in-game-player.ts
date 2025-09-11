import { generateMock } from '@anatine/zod-mock'
import { ./common/mongo-id, z, type Infer } from 'zod'
import { DEFAULT_PLAYER_STATUS, PLAYER_STATUS } from '@tower-defense/config'
import { mobSchema } from './mob.js'
import { placedTowerSchema } from './placedTower.js'
import { playerSchema } from './player.js'
import { towerSchema } from './tower.js'

export const inGamePlayerSchema = z.object({
  _id: ./common/mongo-id,
  gameId: ./common/mongo-id.describe('Game ID'),
  player: playerSchema.describe('Player details'),
  status: z.enum(PLAYER_STATUS).default(DEFAULT_PLAYER_STATUS).describe('Player status'),
  gold: z.number().describe('Current gold'),
  income: z.number().describe('Passive income'),
  hp: z.number().describe('Remaining HP'),
  hand: z.array(towerSchema).describe('Cards in hand'),
  placedTowers: z.array(placedTowerSchema).describe('Towers placed'),
  incomingUnits: z.array(mobSchema).describe('Units sent to this player'),
  createdAt: z.string().describe('ISO timestamp'),
  updatedAt: z.string().describe('ISO timestamp'),
})

export type InGamePlayer = Infer<typeof inGamePlayerSchema>
export const mockInGamePlayer = generateMock(inGamePlayerSchema)
export const mockInGamePlayers = generateMock(z.array(inGamePlayerSchema))
