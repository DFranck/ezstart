import type { Server as IOServer } from 'socket.io'

let io: IOServer | null = null

export function setIO(ioInstance: IOServer) {
  io = ioInstance
}

export function getIO(): IOServer {
  if (!io) throw new Error('Socket.IO not initialized')
  return io
}
