import type { InGamePlayer, Tower } from '@tower-defense/types'
import { computeCoveredCells, isColliding } from '@tower-defense/utils'
import { calculateTowerPrice, getTierFromGoldSpent } from '@tower-defense/config'
import { ticker } from '../../tickers/tickerEngine.js'

export function canPlaceTowerAt(
  gameId: string,
  playerId: string,
  x: number,
  y: number,
  tower: Tower
): boolean {
  const game = ticker.getState(gameId)
  if (!game || !game.players || !Array.isArray(game.players)) return false

  const player = game.players.find((p: any) =>
    p.player?._id?.toString() === playerId || p.playerId === playerId
  )
  if (!player) return false

  // Check if player has enough gold
  const towerPrice = calculateTowerPrice(tower)
  if ((player.gold ?? 0) < towerPrice) {
    console.log(`[canPlaceTowerAt] Not enough gold: ${player.gold} < ${towerPrice}`)
    return false
  }

  const towers = player.placedTowers
  const cells = computeCoveredCells(x, y, tower)

  // Vérifier collision avec les tours
  if (isColliding(cells, towers)) return false

  // Vérifier si un mob est présent sur une des cellules
  const activeMobs = game.activeMobs || []
  const mobsOnPlayer = activeMobs.filter((mob: any) => mob.targetPlayerId === playerId)

  for (const mob of mobsOnPlayer) {
    const mobCell = {
      x: Math.floor(mob.position.x),
      y: Math.floor(mob.position.y)
    }

    // Vérifier si le mob est sur une des cellules de la tour
    for (const cell of cells) {
      if (cell.x === mobCell.x && cell.y === mobCell.y) {
        return false // Un mob est présent sur cette cellule
      }
    }
  }

  return true
}

export async function placeTower(
  gameId: string,
  playerId: string,
  x: number,
  y: number,
  tower: Tower
): Promise<void> {
  const coveredCells = computeCoveredCells(x, y, tower)
  const towerPrice = calculateTowerPrice(tower)

  // 1. Mettre à jour le ticker (état en mémoire)
  ticker.mutate(gameId, state => {
    if (!state.players || !Array.isArray(state.players)) {
      console.warn(`[placeTower] Invalid players array for game ${gameId}`)
      return state
    }

    const players = state.players.map((p: any) => {
      if ((p.player?._id?.toString() || p.playerId) !== playerId) return p

      const placedTower = {
        ...tower,
        origin: { x, y },
        coveredCells,
      }

      // Deduct gold and update goldSpent
      const newGold = Math.max(0, (p.gold ?? 0) - towerPrice)
      const newGoldSpent = (p.goldSpent ?? 0) + towerPrice

      // Check for tier unlock
      const newTier = getTierFromGoldSpent(newGoldSpent)
      const tierChanged = newTier !== (p.tier ?? 1)

      if (tierChanged) {
        console.log(`[placeTower] 🎉 Tier unlocked! ${p.tier ?? 1} → ${newTier}`)
      }

      console.log(
        `[placeTower] Deducting ${towerPrice} gold (${p.gold} → ${newGold}), spent: ${newGoldSpent}, tier: ${newTier}`
      )

      return {
        ...p,
        placedTowers: [...p.placedTowers, placedTower],
        gold: newGold,
        goldSpent: newGoldSpent,
        tier: newTier,
      }
    })

    return {
      ...state,
      players,
      updatedAt: new Date().toISOString(),
    }
  })

  // Towers restent en mémoire dans le ticker - pas de DB pendant le gameplay
}
