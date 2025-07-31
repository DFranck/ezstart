// @ezstart/types/tower-defense/rpc.ts
import { z, type Infer } from '../zod-extended';

// ---- create_game
export const createGameSchema = z.object({
  playerName: z.string().describe('Initial player name'),
});
export type CreateGamePayload = Infer<typeof createGameSchema>;

// 🔵 Ce que le BACK renvoie
export const createGameResponseSchema = z.object({
  gameId: z.string().describe('Game ID'),
  playerId: z.string().describe('Player ID'),
  playerName: z.string().describe('Player name'),
  timestamp: z.string().describe('ISO timestamp'),
});
export type CreateGameResponse = Infer<typeof createGameResponseSchema>;

// ---- connect_to_game
export const connectToGameSchema = z.object({
  playerId: z.string().describe('ID of the connecting player'),
  gameId: z.string().describe('ID of the game to join'),
});
export type ConnectToGamePayload = Infer<typeof connectToGameSchema>;

// ---- player_action.place
export const playerActionPlaceSchema = z.object({
  type: z.literal('place'),
  payload: z.object({
    towerId: z.string().describe('Tower ID from hand'),
    x: z.number(),
    y: z.number(),
  }),
});
export type PlayerActionPlace = Infer<typeof playerActionPlaceSchema>;

// ---- player_action.send
export const playerActionSendSchema = z.object({
  type: z.literal('send'),
  payload: z.object({
    mobType: z.enum(['goblin', 'wolf', 'boss']),
  }),
});
export type PlayerActionSend = Infer<typeof playerActionSendSchema>;

// ---- union globale pour toutes les actions
export const playerActionSchema = z.discriminatedUnion('type', [
  playerActionPlaceSchema,
  playerActionSendSchema,
]);
export type PlayerAction = Infer<typeof playerActionSchema>;
