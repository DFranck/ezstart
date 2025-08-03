import { GameProvider } from '@/providers/GameProvider'
import { logger } from '@ezstart/ui/lib'
import React from 'react'

const layout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameId: string }>
}) => {
  const { gameId } = await Promise.resolve(params)
  logger.debug('[GameProvider]', gameId)
  return <GameProvider gameId={gameId}>{children}</GameProvider>
}
export default layout
