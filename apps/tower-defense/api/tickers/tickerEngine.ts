import { createTickerEngine } from '@ezstart/api-core'
import type { Game } from '@tower-defense/types'

export const ticker = createTickerEngine<Game>({
  createInitialState: gameId => ({
    _id: gameId,
    players: [],
    map: [],
    shopTowers: [],
    shopUnits: [],
    tick: 0,
    host: undefined,
    phase: 'waiting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  onTick: (gameId, state, tick) => {
    return { ...state, tick }
  },
})
