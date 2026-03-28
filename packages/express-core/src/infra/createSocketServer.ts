import { Server as HTTPServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'

export type SocketServerOptions = {
  onConnection?: (socket: Socket, io: IOServer) => void
  corsOrigins?: string[]
}

export function createSocketServer(
  httpServer: HTTPServer,
  options: SocketServerOptions = {}
): IOServer {
  const { corsOrigins = ['*'] } = options

  const io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  })

  const corsLabel = corsOrigins.length === 1 && corsOrigins[0] === '*' ? 'ALL (*)' : `${corsOrigins.length} origins`
  console.log(`🧩 Socket.IO server initialized with CORS: ${corsLabel}`)

  io.on('connection', socket => {
    console.log(`⚡ Socket.IO server New connection: ${socket.id}`)

    options.onConnection?.(socket, io)
  })

  return io
}
