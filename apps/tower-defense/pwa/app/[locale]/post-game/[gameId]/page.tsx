import { callApi } from '@ezstart/ui/utils'
import { notFound } from 'next/navigation'

export default async function PostGamePage(props: { params: Promise<{ gameId: string }> }) {
  const { params } = props
  const { gameId } = await params

  const res = await callApi(`/api/games/${gameId}`)
  if (!res.ok) return notFound()

  const game = res.data

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Game Results</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-lg mb-4">Game ID: {gameId}</p>
        <p className="text-gray-600 dark:text-gray-400">
          This page will show the final results and statistics of the game.
        </p>
      </div>
    </div>
  )
}