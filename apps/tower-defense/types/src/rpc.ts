// @ezstart/types/tower-defense/rpc.ts
import { mongoIdSchema, z, type Infer } from '@ezstart/types'
import { playerSchema } from './player.js'

// ---- create_game
export const createGameSchema = z.object({
  playerId: z.string().describe('Player ID'),
})
export const createGameResponseSchema = z.object({
  gameId: z.string().describe('Game ID'),
})
export type CreateGamePayload = Infer<typeof createGameSchema>
export type CreateGameResponse = Infer<typeof createGameResponseSchema>
// ---- join_game
export const joinGameResponseSchema = z.object({
  playerId: z.string().describe('Player ID'),
  gameId: z.string().describe('Game ID'),
  joinedAt: z.string().describe('ISO timestamp'),
  players: z.array(playerSchema).describe('List of players'),
})
export type JoinGameResponse = Infer<typeof joinGameResponseSchema>
//--------
export const createOrFindPlayerSchema = z.object({
  name: z.string().describe('Player name'),
  userId: z.string().describe('User ID from EZAuth'),
})
export type CreateOrFindPlayerPayload = Infer<typeof createOrFindPlayerSchema>

export const playerResponseSchema = playerSchema.extend({
  player: playerSchema.describe('Player'),
  isNew: z.boolean().describe('true if new player, false if existing player'),
})

export type PlayerResponse = Infer<typeof playerResponseSchema>

// ---- connect_to_game
export const connectToGameSchema = z.object({
  playerId: z.string().describe('ID of the connecting player'),
  gameId: z.string().describe('ID of the game to join'),
})
export type ConnectToGamePayload = Infer<typeof connectToGameSchema>

// ---- player_action.place
export const playerActionPlaceSchema = z.object({
  type: z.literal('place'),
  payload: z.object({
    towerId: z.string().describe('Tower ID from hand'),
    x: z.number(),
    y: z.number(),
  }),
})
export type PlayerActionPlace = Infer<typeof playerActionPlaceSchema>

// ---- player_action.send
export const playerActionSendSchema = z.object({
  type: z.literal('send'),
  payload: z.object({
    mobType: z.enum(['goblin', 'wolf', 'boss']),
  }),
})
export type PlayerActionSend = Infer<typeof playerActionSendSchema>

// ---- union globale pour toutes les actions
export const playerActionSchema = z.discriminatedUnion('type', [
  playerActionPlaceSchema,
  playerActionSendSchema,
])
export type PlayerAction = Infer<typeof playerActionSchema>
