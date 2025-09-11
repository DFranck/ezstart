// @ezstart/types/tower-defense/rpc.ts
import { z, type infer } from 'zod'
import { mongoIdSchema } from './common/mongo-id.js'
import { playerSchema } from './player.js'

// ---- create_game
export const createGameSchema = z.object({
  playerId: z.string().describe('Player ID'),
})
export const createGameResponseSchema = z.object({
  gameId: z.string().describe('Game ID'),
})
export type CreateGamePayload = z.infer<typeof createGameSchema>
export type CreateGameResponse = z.infer<typeof createGameResponseSchema>
// ---- join_game
export const joinGameResponseSchema = z.object({
  playerId: z.string().describe('Player ID'),
  gameId: z.string().describe('Game ID'),
  joinedAt: z.string().describe('ISO timestamp'),
  players: z.array(playerSchema).describe('List of players'),
})
export type JoinGameResponse = z.infer<typeof joinGameResponseSchema>
//--------
export const createOrFindPlayerSchema = z.object({
  name: z.string().describe('Player name'),
  userId: z.string().describe('User ID from EZAuth'),
})
export type CreateOrFindPlayerPayload = z.infer<typeof createOrFindPlayerSchema>

export const playerResponseSchema = playerSchema.extend({
  player: playerSchema.describe('Player'),
  isNew: z.boolean().describe('true if new player, false if existing player'),
})

export type PlayerResponse = z.infer<typeof playerResponseSchema>

// ---- connect_to_game
export const connectToGameSchema = z.object({
  playerId: z.string().describe('ID of the connecting player'),
  gameId: z.string().describe('ID of the game to join'),
})
export type ConnectToGamePayload = z.infer<typeof connectToGameSchema>

// ---- player_action.place
export const playerActionPlaceSchema = z.object({
  type: z.literal('place'),
  payload: z.object({
    towerId: z.string().describe('Tower ID from hand'),
    x: z.number(),
    y: z.number(),
  }),
})
export type PlayerActionPlace = z.infer<typeof playerActionPlaceSchema>

// ---- player_action.send
export const playerActionSendSchema = z.object({
  type: z.literal('send'),
  payload: z.object({
    mobType: z.enum(['goblin', 'wolf', 'boss']),
  }),
})
export type PlayerActionSend = z.infer<typeof playerActionSendSchema>

// ---- union globale pour toutes les actions
export const playerActionSchema = z.discriminatedUnion('type', [
  playerActionPlaceSchema,
  playerActionSendSchema,
])
export type PlayerAction = z.infer<typeof playerActionSchema>
