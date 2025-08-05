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
      console.log(`[ticker] 🆕 Creating room for game: ${gameId}`)
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
    let state = initialState
    let tick = 0
    console.log(`[⏱️ ticker] Started ticking for game ${gameId} every ${tickIntervalMs}ms`)

    return setInterval(() => {
      tick++
      state = onTick(gameId, state, tick)
      const room = rooms.get(gameId)
      if (room) {
        room.state = state
        room.tick = tick
      }
    }, tickIntervalMs)
  }
  function mutate(gameId: string, fn: (state: State) => State) {
    const room = rooms.get(gameId)
    if (!room) return
    const newState = fn(room.state)
    room.state = newState
  }

  function getState(gameId: string): State | undefined {
    return rooms.get(gameId)?.state
  }

  return {
    ensureRoom,
    getState,
    mutate,
  }
}
