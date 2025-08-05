import { Server as HTTPServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'

export type SocketServerOptions = {
  onConnection?: (socket: Socket, io: IOServer) => void
}

export function createSocketServer(
  httpServer: HTTPServer,
  options: SocketServerOptions = {}
): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: '*' },
  })

  console.log('🧩 Socket.IO server initialized')

  io.on('connection', socket => {
    console.log('⚡ New socket connected:', socket.id)
    options.onConnection?.(socket, io)
  })

  io.on('disconnect', socket => {
    console.log('⚡ Socket disconnected:', socket.id)
  })

  return io
}
