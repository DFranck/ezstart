import { Router } from '@ezstart/express-core'
import gamesRoutes, { gamesRegistry } from './games.js'
import playerRoutes, { playersRegistry } from './players.js'
const router = Router()
export const globalRegistry = [gamesRegistry, playersRegistry]

router.use('/games', gamesRoutes).use('/players', playerRoutes)

export default router
