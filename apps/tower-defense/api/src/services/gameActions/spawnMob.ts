import type { ActiveMob, Mob } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { ticker } from '../../tickers/tickerEngine.js'

export function spawnMob(
  gameId: string,
  mobType: Mob,
  targetPlayerId: string,
  fromPlayerId: string
): void {
  console.log(`[spawnMob] Spawning mob for target player ${targetPlayerId}`)

  ticker.mutate(gameId, state => {
    console.log(`[spawnMob] Current state:`, {
      hasId: !!state._id,
      playersCount: state.players?.length || 0,
      mobsCount: state.activeMobs?.length || 0
    })

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
      console.warn(`[spawnMob] No valid path found for player ${targetPlayerId}`)
      return state
    }

    // Position de spawn = première case du path
    const spawnPosition = path[0]

    // Créer un nouveau mob actif
    const newMob: ActiveMob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID unique simple
      mob: mobType,
      currentHp: mobType.hp,
      position: { x: spawnPosition.x, y: spawnPosition.y },
      pathIndex: 0,
      targetPlayerId: targetPlayerId,
    }

    console.log(`[spawnMob] Created mob:`, newMob)

    const newActiveMobs = [...(state.activeMobs || []), newMob]
    console.log(`[spawnMob] New activeMobs count: ${newActiveMobs.length}`)

    const newState = {
      ...state,
      activeMobs: newActiveMobs,
      updatedAt: new Date().toISOString(),
    }
    
    console.log(`[spawnMob] Returning state with ${newState.activeMobs?.length} mobs`)
    return newState
  })
  
  // Vérifier l'état après mutation
  const afterState = ticker.getState(gameId)
  console.log(`[spawnMob] State after mutation: ${afterState?.activeMobs?.length || 0} mobs`)
}