import type { Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
import { syncTickerWithDatabase, ticker } from '../tickers/tickerEngine'

export function registerSocketHandlers(socket: Socket) {
  console.log(`⚡ [socket] New connection: ${socket.id}`)

  socket.on('gameAction', async ({ gameId, action }) => {
    console.log(`📩 [gameAction] from ${socket.id} | gameId: ${gameId}`)
    console.log('   ↳ Action:', action)

    // S'assurer que la room existe et est synchronisée avec la DB
    ticker.ensureRoom(gameId)
    await syncTickerWithDatabase(gameId)

    const result = handleGameAction(gameId, action)

    if (!result.success) {
      console.warn(`❌ [gameAction] Rejected: ${result.reason}`)
      socket.emit('actionRejected', { reason: result.reason })
      return
    }

    const newState = getGameTicker(gameId)?.getState()
    if (!newState) {
      console.warn(`❌ [gameAction] No new state found after action`)
      return
    }

    console.log(`📤 [gameState] Broadcasting updated state to room: ${gameId}`)
    getIO().to(gameId).emit('gameState', newState)
  })

  socket.on('disconnect', () => {
    console.log(`❌ [socket] Disconnected: ${socket.id}`)
  })
}
