import type { GamePlayer } from '@tower-defense/types'
import { GameModel } from '../models/Game.js'
import { ticker } from '../tickers/tickerEngine.js'

export async function checkEndGame(gameId: string) {
  const state = ticker.getState(gameId)
  if (!state) return

  const active = state.players.filter((p: GamePlayer) => p.status === 'active')

  if (active.length <= 1 && state.phase !== 'finished') {
    console.log(`[game:end] Game ${gameId} finished.`)

    ticker.destroyRoom(gameId)

    const gameDoc = await GameModel.findById(gameId)
    if (gameDoc) {
      gameDoc.phase = 'finished'
      await gameDoc.save()
    }
  }
}
