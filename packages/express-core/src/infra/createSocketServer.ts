import { Server as HTTPServer } from 'http'
import { logger } from '@ezstart/logger/server'
import { Server as IOServer, Socket } from 'socket.io'

export type SocketServerOptions = {
  onConnection?: (socket: Socket, io: IOServer) => void
  /** CORS origins for Socket.IO. Required — no default to avoid accidental open access. */
  corsOrigins: string[]
}

export function createSocketServer(httpServer: HTTPServer, options: SocketServerOptions): IOServer {
  const { corsOrigins } = options

  if (corsOrigins.length === 0) {
    logger.warn('⚠️ [Socket.IO] No CORS origins configured — connections may be blocked')
  }

  const io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  })

  const corsLabel =
    corsOrigins.length === 1 && corsOrigins[0] === '*' ? 'ALL (*)' : `${corsOrigins.length} origins`
  logger.info(`🧩 Socket.IO server initialized with CORS: ${corsLabel}`)

  io.on('connection', socket => {
    logger.debug(`⚡ Socket.IO server New connection: ${socket.id}`)

    options.onConnection?.(socket, io)
  })

  return io
}
