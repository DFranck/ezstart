/**
 * Optional Socket.IO wrapper.
 *
 * `socket.io` is declared as an optional peer dependency — this module only
 * loads it when `createSocketServer()` is actually called, so consumers who
 * don't need realtime features never pay the bundle cost.
 */

import type { Server as HttpServer } from 'http'
import type { Server as IOServer, Socket } from 'socket.io'
import type { ServerLogger } from './types.js'
import { silentLogger } from './internal/logger.js'

/**
 * Config accepted by `createSocketServer`.
 */
export type SocketServerConfig = {
  /** CORS origins — required, no default to avoid accidental open access. */
  corsOrigins: string[]
  /** Optional connection handler. */
  onConnection?: (socket: Socket, io: IOServer) => void
  /** Logger override. */
  logger?: ServerLogger
}

/**
 * Attach a Socket.IO server to an existing HTTP server.
 *
 * @example
 * ```ts
 * import { createSocketServer } from '@ezstart/api-core'
 *
 * const io = await createSocketServer(httpServer, {
 *   corsOrigins: ['https://myapp.example.com'],
 *   onConnection: socket => {
 *     // realtime handlers...
 *   },
 * })
 * ```
 *
 * @internal — exposed via the package entry but marked internal because
 * realtime features are opt-in and consumers typically own the Socket.IO
 * lifecycle themselves.
 */
export async function createSocketServer(
  httpServer: HttpServer,
  config: SocketServerConfig
): Promise<IOServer> {
  const logger: ServerLogger = config.logger ?? silentLogger

  // Dynamic import keeps `socket.io` truly optional — consumers that don't
  // need realtime never trigger the require, even at type-check time.
  const socketIo: typeof import('socket.io') = await import('socket.io')

  if (config.corsOrigins.length === 0) {
    logger.warn('[Socket.IO] No CORS origins configured — connections may be blocked')
  }

  const io: IOServer = new socketIo.Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: true },
  })

  const corsLabel =
    config.corsOrigins.length === 1 && config.corsOrigins[0] === '*'
      ? 'ALL (*)'
      : `${config.corsOrigins.length} origins`
  logger.info(`[Socket.IO] Server initialized with CORS: ${corsLabel}`)

  io.on('connection', (socket: Socket) => {
    config.onConnection?.(socket, io)
  })

  return io
}
