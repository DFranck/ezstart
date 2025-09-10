'use client'
import { useGameState } from '@/stores/useGameState'
import { useEffect } from 'react'

export function GameInitializer() {
  const initPath = useGameState(s => s.initPath)

  useEffect(() => {
    initPath()
  }, [initPath])

  return null
}
