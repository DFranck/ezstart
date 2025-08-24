'use client'

import { useGame } from '@/contexts/GameContext'
import { useGameState } from '@/stores/useGameState'
import { usePlayerStore } from '@/stores/usePlayerStore'
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
      
      // Synchroniser seulement si le serveur a plus de tours (évite les conflits)
      if (serverTowers.length > localTowers.length) {
        console.log('[GameSync] Server has more towers, synchronizing', {
          server: serverTowers.length,
          local: localTowers.length
        })
        
        useGameState.setState({
          towers: serverTowers,
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