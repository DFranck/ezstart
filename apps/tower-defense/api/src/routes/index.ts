import { Router } from '@ezstart/express-core'
import { gamesRegistries, gamesRouters } from './games/index.js'
import playerRoutes, { playersRegistry } from './players.js'
const router = Router()
export const globalRegistry = [...gamesRegistries, playersRegistry]

gamesRouters.forEach(r => router.use('/games', r))
router.use('/players', playerRoutes)

export default router
