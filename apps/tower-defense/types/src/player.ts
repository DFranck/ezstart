import { mongoIdSchema, z, type Infer } from '@ezstart/types'

export const playerSchema = z.object({
  userId: mongoIdSchema.optional().describe('User id from mongo _id'),
  name: z.string().min(1).describe('Unique display name'),
  gamesPlayed: z.number().default(0),
  gamesWon: z.number().default(0),
  rank: z.number().default(1000),
  // + plus tard : email, avatarUrl, etc.
})

export type Player = Infer<typeof playerSchema>
