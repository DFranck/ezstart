import type { InGamePlayer, Tower } from '@tower-defense/types'
import { computeCoveredCells, isColliding } from '@tower-defense/utils'
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

  const towers = player.placedTowers
  const cells = computeCoveredCells(x, y, tower)

  return !isColliding(cells, towers)
}

export async function placeTower(
  gameId: string,
  playerId: string,
  x: number,
  y: number,
  tower: Tower
): Promise<void> {
  const coveredCells = computeCoveredCells(x, y, tower)

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

      return {
        ...p,
        placedTowers: [...p.placedTowers, placedTower],
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
