import type { GamePlayer, Tower } from '@tower-defense/types'
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
  if (!game) {
    console.log('[canPlaceTowerAt] Game not found:', gameId)
    return false
  }

  console.log('[canPlaceTowerAt] Looking for player:', playerId)
  console.log('[canPlaceTowerAt] Available players in ticker:', game.players.map((p: any) => ({ 
    playerId: p.playerId, 
    playerObjectId: p.player?._id, 
    hasPlayer: !!p.player,
    structure: Object.keys(p) 
  })))
  
  const player = game.players.find((p: any) => 
    p.player?._id?.toString() === playerId || p.playerId === playerId
  )
  if (!player) {
    console.log('[canPlaceTowerAt] Player not found:', playerId)
    return false
  }

  const towers = player.placedTowers
  const cells = computeCoveredCells(x, y, tower)

  return !isColliding(cells, towers)
}

export function placeTower(
  gameId: string,
  playerId: string,
  x: number,
  y: number,
  tower: Tower
): void {
  console.log('[placeTower] Placing tower for player:', playerId, 'at', x, y)
  const coveredCells = computeCoveredCells(x, y, tower)

  ticker.mutate(gameId, state => {
    console.log('[placeTower] Players in state:', state.players.map((p: any) => ({ 
      playerId: p.playerId,
      playerObjectId: p.player?._id,
      hasPlayer: !!p.player 
    })))
    
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
}
