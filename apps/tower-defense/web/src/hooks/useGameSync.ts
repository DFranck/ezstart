'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState, PlacedTowerFrontend } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'
import { useEffect } from 'react'

export function useGameSync() {
  const { game } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)
  const setPath = useGameState(s => s.setPath)
  const resetGame = useGameState(s => s.resetGame)

  useEffect(() => {
    if (!game || !currentPlayer) return

    // Trouver le joueur actuel dans les données du jeu
    const myPlayerData = game.players?.find(p => p.player?._id === currentPlayer?._id)

    if (myPlayerData && myPlayerData.placedTowers) {
      const serverTowers = myPlayerData.placedTowers
      const localTowers = useGameState.getState().towers

      // Convert backend PlacedTower (with towerTypeId) to frontend PlacedTowerFrontend (with full tower data)
      const frontendTowers: PlacedTowerFrontend[] = serverTowers.map(st => {
        const towerType = ENTITY_TOWER_TYPES.find(tt => tt._id === st.towerTypeId) || ENTITY_TOWER_TYPES[0]
        if (!towerType) {
          console.warn(`Unknown towerTypeId: ${st.towerTypeId} and no fallback available`)
        }
        return {
          ...towerType,
          origin: st.origin,
          coveredCells: st.coveredCells,
        } as PlacedTowerFrontend
      })

      // Synchroniser si le serveur a un état différent (pas seulement plus de tours)
      const serverTowersString = JSON.stringify(frontendTowers.map(t => ({ x: t.origin.x, y: t.origin.y, id: t._id })))
      const localTowersString = JSON.stringify(localTowers.map(t => ({ x: t.origin.x, y: t.origin.y, id: t._id })))

      if (serverTowersString !== localTowersString) {
        useGameState.setState({
          towers: frontendTowers,
        })

        // Recalculer le path avec initPath
        useGameState.getState().initPath()
      }
    }
  }, [game, currentPlayer])

  // Reset quand le jeu change ou disparaît
  useEffect(() => {
    if (!game) {
      resetGame()
    }
  }, [game, resetGame])
}