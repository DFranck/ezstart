import { GameProvider } from '@/providers/GameProvider'
import React from 'react'

const layout = async ({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameId: string }>
}) => {
  const { gameId } = await Promise.resolve(params)
  return <GameProvider gameId={gameId}>{children}</GameProvider>
}
export default layout
