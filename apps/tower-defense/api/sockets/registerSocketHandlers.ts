import type { Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
import { syncTickerWithDatabase, ticker } from '../tickers/tickerEngine'
import { GameModel } from '../models/Game'

export function registerSocketHandlers(socket: Socket) {
  console.log(`⚡ [socket] New connection: ${socket.id}`)

  // Lobby handlers
  socket.on('lobby:join', async ({ gameId }) => {
    console.log(`🏠 [lobby:join] ${socket.id} joining lobby: ${gameId}`)
    
    try {
      // Rejoindre la room du lobby
      socket.join(`lobby:${gameId}`)
      
      // Récupérer les données du jeu
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      
      // Notifier les autres joueurs
      socket.to(`lobby:${gameId}`).emit('lobby:playerJoined', {
        _id: socket.id, // TODO: Use actual player data from auth
        name: `Player ${socket.id.slice(0, 6)}`
      })
      
      // Envoyer la liste mise à jour à tous
      getIO().to(`lobby:${gameId}`).emit('lobby:playersUpdated', game.players)
      
    } catch (error) {
      console.error('[lobby:join] Error:', error)
      socket.emit('error', { message: 'Failed to join lobby' })
    }
  })

  socket.on('lobby:leave', ({ gameId }) => {
    console.log(`🏠 [lobby:leave] ${socket.id} leaving lobby: ${gameId}`)
    
    socket.leave(`lobby:${gameId}`)
    socket.to(`lobby:${gameId}`).emit('lobby:playerLeft', socket.id)
  })

  socket.on('lobby:startCountdown', ({ gameId }) => {
    console.log(`⏰ [lobby:startCountdown] ${socket.id} starting countdown for: ${gameId}`)
    
    // Notifier tous les joueurs du lobby
    getIO().to(`lobby:${gameId}`).emit('lobby:countdownStarted')
  })

  // Game action handlers
  socket.on('gameAction', async ({ gameId, action }) => {
    console.log(`📩 [gameAction] from ${socket.id} | gameId: ${gameId}`)
    console.log('   ↳ Action:', action)

    // S'assurer que la room existe et est synchronisée avec la DB
    ticker.ensureRoom(gameId)
    await syncTickerWithDatabase(gameId)

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
    getIO().to(gameId).emit('gameState', newState)
  })

  socket.on('disconnect', () => {
    console.log(`❌ [socket] Disconnected: ${socket.id}`)
  })
}
