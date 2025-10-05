import type { ActiveMob, Mob } from '@tower-defense/types'
import { findPath } from '@tower-defense/utils'
import { calculateUnitPrice, getTierFromGoldSpent } from '@tower-defense/config'
import { ticker } from '../../tickers/tickerEngine.js'

export function spawnMob(
  gameId: string,
  mobType: Mob,
  targetPlayerId: string,
  fromPlayerId: string
): void {
  ticker.mutate(gameId, state => {
    // Check if sender has enough gold
    const fromPlayer = state.players?.find((p: any) =>
      p.player?._id?.toString() === fromPlayerId
    )

    if (!fromPlayer) {
      console.warn(`[spawnMob] Sender player ${fromPlayerId} not found`)
      return state
    }

    const unitPrice = calculateUnitPrice(mobType)
    if ((fromPlayer.gold ?? 0) < unitPrice) {
      console.log(`[spawnMob] Not enough gold: ${fromPlayer.gold} < ${unitPrice}`)
      return state
    }

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

    // Créer un offset persistant pour ce mob (conservé tout au long du trajet)
    const pathOffset = {
      x: (Math.random() - 0.5) * 0.6, // ±0.3 cases
      y: (Math.random() - 0.5) * 0.6  // ±0.3 cases
    }

    const newMob: ActiveMob = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      mob: mobType,
      currentHp: mobType.hp,
      position: {
        x: spawnPosition.x + pathOffset.x,
        y: spawnPosition.y + pathOffset.y
      },
      pathIndex: 0,
      targetPlayerId: targetPlayerId,
      pathOffset: pathOffset, // Stocker l'offset pour l'appliquer à chaque waypoint
    }

    const newActiveMobs = [...(state.activeMobs || []), newMob]
    console.log(`[spawnMob] ✅ Spawned ${mobType.name} → total: ${newActiveMobs.length} mobs`)

    // Deduct gold from sender and update goldSpent
    const updatedPlayers = state.players?.map((p: any) => {
      if (p.player?._id?.toString() !== fromPlayerId) return p

      const newGold = Math.max(0, (p.gold ?? 0) - unitPrice)
      const newGoldSpent = (p.goldSpent ?? 0) + unitPrice

      // Check for tier unlock
      const newTier = getTierFromGoldSpent(newGoldSpent)
      const tierChanged = newTier !== (p.tier ?? 1)

      if (tierChanged) {
        console.log(`[spawnMob] 🎉 Tier unlocked! ${p.tier ?? 1} → ${newTier}`)
      }

      console.log(
        `[spawnMob] Deducting ${unitPrice} gold from ${fromPlayerId} (${p.gold} → ${newGold}), spent: ${newGoldSpent}, tier: ${newTier}`
      )

      return {
        ...p,
        gold: newGold,
        goldSpent: newGoldSpent,
        tier: newTier,
      }
    })

    return {
      ...state,
      players: updatedPlayers,
      activeMobs: newActiveMobs,
      updatedAt: new Date().toISOString(),
    }
  })
}