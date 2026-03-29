import { logger } from '@ezstart/logger/server'

export type TickerOptions<State> = {
  tickIntervalMs?: number
  createInitialState: (gameId: string) => State
  onTick: (gameId: string, state: State, tick: number) => State
}

type GameRoom<State> = {
  gameId: string
  state: State
  tick: number
  interval: NodeJS.Timeout
}

const defaultInterval = 100
const rooms = new Map<string, GameRoom<any>>()

export function createTickerEngine<State>(opts: TickerOptions<State>) {
  const { tickIntervalMs = defaultInterval, createInitialState, onTick } = opts

  function ensureRoom(gameId: string) {
    if (!rooms.has(gameId)) {
      logger.debug(`[ticker] 🆕 Creating room for game: ${gameId}`)
      const initialState = createInitialState(gameId)
      const room: GameRoom<State> = {
        gameId,
        state: initialState,
        tick: 0,
        interval: startTickLoop(gameId, initialState),
      }
      rooms.set(gameId, room)
    }
  }

  function startTickLoop(gameId: string, initialState: State): NodeJS.Timeout {
    logger.debug(`[⏱️ ticker] Started ticking for game ${gameId} every ${tickIntervalMs}ms`)

    return setInterval(async () => {
      const room = rooms.get(gameId)
      if (!room) return

      room.tick++
      // IMPORTANT: Always read from room.state to respect mutations
      // IMPORTANT: await onTick if it's async to get the actual state, not a Promise
      const newState = await onTick(gameId, room.state, room.tick)
      room.state = newState
    }, tickIntervalMs)
  }
  function mutate(gameId: string, fn: (state: State) => State) {
    const room = rooms.get(gameId)
    if (!room) return
    const newState = fn(room.state)
    room.state = newState
  }
  function destroyRoom(gameId: string): boolean {
    const room = rooms.get(gameId)
    if (!room) return false
    clearInterval(room.interval)
    rooms.delete(gameId)
    logger.debug(`[🗑️ ticker] Destroyed room for gameId: ${gameId}`)
    return true
  }
  function getState(gameId: string): State | undefined {
    return rooms.get(gameId)?.state
  }
  function getRoomTick(gameId: string): number {
    return rooms.get(gameId)?.tick || 0
  }

  return {
    ensureRoom,
    getState,
    getRoomTick,
    mutate,
    destroyRoom,
  }
}
