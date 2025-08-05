import type { Server as IOServer, Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
import { ticker } from '../tickers/tickerEngine'

export function registerSocketHandlers(socket: Socket, io: IOServer) {
  getIO()

  console.log(`⚡ [socket] New connection: ${socket.id}`)

  socket.on('gameAction', ({ gameId, action }) => {
    console.log(`📩 [gameAction] from ${socket.id} | gameId: ${gameId}`)
    console.log('   ↳ Action:', action)
    
    ticker.ensureRoom(gameId)

    
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
    io.to(gameId).emit('gameState', newState)
  })

  socket.on('disconnect', () => {
    console.log(`❌ [socket] Disconnected: ${socket.id}`)
  })
}
