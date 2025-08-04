import type { Server as IOServer, Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
export function registerSocketHandlers(socket: Socket, io: IOServer) {
  getIO()
  socket.on('gameAction', ({ gameId, action }) => {
    const result = handleGameAction(gameId, action)

    if (!result.success) {
      socket.emit('actionRejected', { reason: result.reason })
      return
    }

    const newState = getGameTicker(gameId)?.getState()
    if (newState) io.to(gameId).emit('gameState', newState)
  })
}
