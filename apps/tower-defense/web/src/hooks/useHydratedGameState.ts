// @/hooks/useHydratedGameState.ts
import { useGameState } from '@/stores/useGameState'
import { useEffect, useState } from 'react'

export function useHydratedGameState() {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (useGameState.persist.hasHydrated()) {
      setHydrated(true)
      return
    }

    const unsub = useGameState.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    return unsub
  }, [])

  return hydrated
}
