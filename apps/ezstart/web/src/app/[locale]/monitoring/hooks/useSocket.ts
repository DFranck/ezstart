import { logger } from '@ezstart/logger'
import { useEffect, useRef, type RefObject } from 'react'
import { io, type Socket } from 'socket.io-client'
import { MONITORING_API_URL } from '../lib/config'

interface UseSocketOptions {
  onHealthChecksUpdated?: (data: any) => void
}

export function useSocket({
  onHealthChecksUpdated,
}: UseSocketOptions = {}): RefObject<Socket | null> {
  const socketRef = useRef<Socket | null>(null)
  const callbackRef = useRef(onHealthChecksUpdated)

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = onHealthChecksUpdated
  }, [onHealthChecksUpdated])

  useEffect(() => {
    logger.debug('[Monitoring] Connecting to Socket.IO...')

    const socket = io(MONITORING_API_URL, {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      logger.debug('[Monitoring] Socket.IO connected:', socket.id)
    })

    socket.on('health-checks-updated', data => {
      logger.debug('[Monitoring] Received health-checks-updated event:', data)
      callbackRef.current?.(data)
    })

    socket.on('disconnect', () => {
      logger.debug('[Monitoring] Socket.IO disconnected')
    })

    socket.on('connect_error', err => {
      logger.error('[Monitoring] Socket.IO connection error:', err.message)
    })

    return () => {
      logger.debug('[Monitoring] Disconnecting Socket.IO...')
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Connect only once on mount

  return socketRef
}
