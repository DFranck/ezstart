'use client'

import { useGame } from '@/contexts/GameContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button } from '@ezstart/ui/components'
import { Mob } from '@tower-defense/types'

interface MobSpawnerProps {
  targetPlayerId: string | null
}

export function MobSpawner({ targetPlayerId }: MobSpawnerProps) {
  const { game, sendAction } = useGame()
  const currentPlayer = usePlayerStore(s => s.player)

  if (!game || !currentPlayer) {
    return null
  }
  
  // Pour test : si pas de target ou si c'est soi-même, cibler l'autre joueur
  let actualTargetPlayerId = targetPlayerId
  if (!targetPlayerId || targetPlayerId === currentPlayer._id) {
    const otherPlayer = game.players?.find(p => p.player?._id !== currentPlayer._id)
    actualTargetPlayerId = otherPlayer?.player?._id || null
  }
  
  if (!actualTargetPlayerId) {
    return null
  }

  const handleSpawnMob = () => {
    // Créer un mob de test simple
    const testMob: Mob = {
      _id: 'test-mob',
      name: 'Test Mob',
      elementalType: 'ground',
      hp: 100,
      speed: 2,
      damage: 1,
      effects: [],
      canFly: false,
      attackRange: 0,
      collisionRadius: 0.3
    }

    sendAction({
      type: 'spawnMob',
      payload: {
        mobType: testMob,
        targetPlayerId: actualTargetPlayerId,
        fromPlayerId: currentPlayer._id,
      },
    })
  }

  const targetPlayerName = game.players?.find(p => p.player?._id === actualTargetPlayerId)?.player?.name || 'Unknown'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="default"
        size="sm"
        onClick={handleSpawnMob}
        className="bg-red-500 text-white hover:bg-red-600"
        title={`Spawn mob targeting ${targetPlayerName}`}
      >
        Spawn Mob → {targetPlayerName}
      </Button>
    </div>
  )
}