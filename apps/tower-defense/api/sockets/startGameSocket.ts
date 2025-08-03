import type { Server as IOServer, Socket } from 'socket.io'
import { startGameService } from '../services/startGameService'
import { ticker } from '../tickers/tickerEngine'

export function startGameSocket(socket: Socket, io: IOServer) {
  socket.on('startGame', (gameId: string) => {
    // startGameService -> modifie DB etc.
    startGameService({ gameId }).then(() => {
      ticker.start(gameId, state => {
        io.to(gameId).emit('gameState', state)
      })

      io.to(gameId).emit('gameStarted') // évènement socket côté front
    })
  })
}
