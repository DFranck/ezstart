'use client'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { useState } from 'react'
import { MultiPlayerCanvas } from './MultiPlayerCanvas'
import { PlayersViewMenu } from './PlayersViewMenu'

export function GameCanvasCanvas() {
  const currentPlayer = usePlayerStore(s => s.player)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)

  // Toujours afficher le canvas du joueur actuel par défaut
  const displayedPlayerId = selectedPlayerId || currentPlayer?._id || null
  
  console.log('[GameCanvasCanvas] Debug:', {
    currentPlayerId: currentPlayer?._id,
    selectedPlayerId,
    displayedPlayerId,
    currentPlayerName: currentPlayer?.name
  })

  return (
    <div className="relative">
      <PlayersViewMenu 
        selectedPlayerId={selectedPlayerId}
        onPlayerSelect={setSelectedPlayerId}
        currentPlayerId={currentPlayer?._id || null}
      />
      
      <MultiPlayerCanvas
        selectedPlayerId={displayedPlayerId}
      />
    </div>
  )
}
