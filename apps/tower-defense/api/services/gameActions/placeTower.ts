import type { GamePlayer, Tower } from '@tower-defense/types'
import { computeCoveredCells, isColliding } from '@tower-defense/utils'
import { ticker } from '../../tickers/tickerEngine'

export function canPlaceTowerAt(
  gameId: string,
  playerId: string,
  x: number,
  y: number,
  tower: Tower
): boolean {
  const game = ticker.getState(gameId)
  if (!game) return false

  const player = game.players.find(p => p.playerId === playerId)
  if (!player) return false

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
  const coveredCells = computeCoveredCells(x, y, tower)

  ticker.mutate(gameId, state => {
    const players = state.players.map((p: GamePlayer) => {
      if (p.playerId !== playerId) return p

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
