import { registry as listGamesRegistry, router as listGamesRouter } from './list.js'
import { registry as createGameRegistry, router as createGameRouter } from './create.js'
import { registry as getGameByIdRegistry, router as getGameByIdRouter } from './get-by-id.js'
import { registry as startGameRegistry, router as startGameRouter } from './start.js'
import { registry as joinGameRegistry, router as joinGameRouter } from './join.js'
import { registry as leaveGameRegistry, router as leaveGameRouter } from './leave.js'

export const gamesRegistries = [
  listGamesRegistry,
  createGameRegistry,
  getGameByIdRegistry,
  startGameRegistry,
  joinGameRegistry,
  leaveGameRegistry,
]

export const gamesRouters = [
  listGamesRouter,
  createGameRouter,
  getGameByIdRouter,
  startGameRouter,
  joinGameRouter,
  leaveGameRouter,
]
