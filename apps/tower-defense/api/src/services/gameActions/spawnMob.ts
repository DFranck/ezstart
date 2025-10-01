import type { ActiveMob, Mob } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { ticker } from '../../tickers/tickerEngine.js'

export function spawnMob(
  gameId: string,
  mobType: Mob,
  targetPlayerId: string,
  fromPlayerId: string
): void {
  ticker.mutate(gameId, state => {
    // Trouver le joueur ciblé et calculer son path
    const targetPlayer = state.players?.find((p: any) =>
      p.player?._id?.toString() === targetPlayerId
    )

    if (!targetPlayer) {
      console.warn(`[spawnMob] Target player ${targetPlayerId} not found`)
      return state
    }

    // Calculer le path du joueur ciblé
    const blockedCells = targetPlayer.placedTowers?.flatMap((t: any) => t.coveredCells) || []
    const path = findPath(blockedCells)

    if (!path || path.length === 0) {
      console.warn(`[spawnMob] No valid path for player ${targetPlayerId}`)
      return state
    }

    const spawnPosition = path[0]
    if (!spawnPosition) {
      console.warn(`[spawnMob] No spawn position for player ${targetPlayerId}`)
      return state
    }

    // Créer un nouveau mob actif
    const newMob: ActiveMob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mob: mobType,
      currentHp: mobType.hp,
      position: { x: spawnPosition.x, y: spawnPosition.y },
      pathIndex: 0,
      targetPlayerId: targetPlayerId,
    }

    const newActiveMobs = [...(state.activeMobs || []), newMob]
    console.log(`[spawnMob] ✅ Spawned ${mobType.name} → total: ${newActiveMobs.length} mobs`)

    return {
      ...state,
      activeMobs: newActiveMobs,
      updatedAt: new Date().toISOString(),
    }
  })
}