import { ./common/mongo-id, z, type Infer } from 'zod'

export const playerSchema = z.object({
  _id: ./common/mongo-id.describe('Player id from mongo _id'),
  userId: z.string().describe('User id from EZAuth'),
  name: z.string().min(1).describe('Unique display name'),
  gamesPlayed: z.number().default(0).describe('Number of games played'),
  gamesWon: z.number().default(0).describe('Number of games won'),
  rank: z.number().default(1000).describe('Ranking'),
})

export type Player = Infer<typeof playerSchema>
