'use client'

import { useGamesSocket } from '@/contexts/GamesSocketContext'
import { usePlayerStore } from '@/stores/usePlayerStore'
import { Burger, Button, Dropdown, Icon } from '@ezstart/ui/components'
import { callApi } from '@ezstart/ui/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface GameMenuProps {
  gameId: string
}

export function GameMenu({ gameId }: GameMenuProps) {
  const router = useRouter()
  const { player } = usePlayerStore()
  const { socket } = useGamesSocket()
  const [isBurgerOpen, setIsBurgerOpen] = useState(false)

  const handleLeaveGame = async () => {
    if (!player?._id) return

    try {
      const response = await callApi(`/api/games/${gameId}/leave`, {
        method: 'POST',
        body: { playerId: player._id },
      })

      if (response.ok) {
        router.push('/')
      } else {
        console.error('Failed to leave game')
      }
    } catch (error) {
      console.error('Error leaving game:', error)
    }
  }

  // Écouter les événements de fin de game
  useEffect(() => {
    if (!socket) return

    const handleGameFinished = () => {
      console.log('Game finished, redirecting to home...')
      router.push('/')
    }

    const handlePlayerLeft = (data: any) => {
      console.log('Player left:', data)
      // Si c'est notre joueur qui est parti, ne pas rediriger car on le fait déjà
    }

    const handlePlayerEliminated = (data: any) => {
      console.log('Player eliminated:', data)
      
      // Si c'est notre joueur qui est éliminé, le rediriger
      if (data.playerId === player?._id) {
        console.log('You have been eliminated! Redirecting to home...')
        router.push('/')
      }
    }

    socket.on('gameFinished', handleGameFinished)
    socket.on('playerLeft', handlePlayerLeft)
    socket.on('playerEliminated', handlePlayerEliminated)

    return () => {
      socket.off('gameFinished', handleGameFinished)
      socket.off('playerLeft', handlePlayerLeft)
      socket.off('playerEliminated', handlePlayerEliminated)
    }
  }, [socket, router])

  const menuItems = [
    {
      label: 'Leave Game',
      value: 'leave',
      onSelect: handleLeaveGame,
    },
  ]

  return (
    <>
      {/* Mobile: Burger Menu */}
      <div className="md:hidden">
        <Burger isOpen={isBurgerOpen} setIsOpen={setIsBurgerOpen} />

        {isBurgerOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
            <div className="flex flex-col p-4 gap-2">
              {menuItems.map(item => (
                <Button
                  key={item.value}
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    item.onSelect()
                    setIsBurgerOpen(false)
                  }}
                >
                  <Icon name="fa:FaSignOutAlt" className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tablet/Desktop: Dropdown Menu */}
      <div className="hidden md:block">
        <Dropdown
          label={
            <div className="flex items-center gap-2">
              <Icon name="fa:FaCog" className="w-4 h-4" />
              <span className="hidden lg:inline">Menu</span>
            </div>
          }
          items={menuItems}
          variant="ghost"
        />
      </div>
    </>
  )
}
