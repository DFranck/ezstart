import type { Server as IOServer, Socket } from 'socket.io'
import { ticker } from '../tickers/tickerEngine'

export function joinGameSocket(socket: Socket, io: IOServer) {
  socket.on('joinGame', (gameId: string) => {
    ticker.ensureRoom(gameId)
    socket.join(gameId)

    const state = ticker.getState(gameId)
    if (state) {
      socket.emit('gameState', state)
    }

    socket.to(gameId).emit('playerJoined', { playerId: socket.id })
  })
}
