import type { Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
import { syncTickerWithDatabase, ticker } from '../tickers/tickerEngine'
import { GameModel } from '../models/Game'
import { PlayerModel } from '../models/Player'

export function registerSocketHandlers(socket: Socket) {
  console.log(`⚡ [socket] New connection: ${socket.id}`)

  // Lobby handlers
  socket.on('lobby:join', async ({ gameId, playerId }) => {
    console.log(`🏠 [lobby:join] ${socket.id} joining lobby: ${gameId}`)
    
    try {
      // Vérifier que le jeu existe et est en phase waiting
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      
      if (game.phase !== 'waiting') {
        socket.emit('error', { message: 'Game already started' })
        return
      }
      
      // Vérifier que le joueur existe
      if (playerId) {
        const player = await PlayerModel.findById(playerId)
        if (!player) {
          socket.emit('error', { message: 'Player not found' })
          return
        }
      }
      
      // Rejoindre la room du lobby
      socket.join(`lobby:${gameId}`)
      
      // Notifier les autres joueurs
      if (playerId) {
        const player = await PlayerModel.findById(playerId)
        socket.to(`lobby:${gameId}`).emit('lobby:playerJoined', {
          _id: playerId,
          name: player?.name || `Player ${playerId.slice(0, 6)}`
        })
      }
      
      // Envoyer la liste mise à jour à tous
      getIO().to(`lobby:${gameId}`).emit('lobby:playersUpdated', game.players)
      
      console.log(`✅ [lobby:join] ${socket.id} successfully joined lobby: ${gameId}`)
      
    } catch (error) {
      console.error('[lobby:join] Error:', error)
      socket.emit('error', { message: 'Failed to join lobby' })
    }
  })

  socket.on('lobby:leave', ({ gameId, playerId }) => {
    console.log(`🏠 [lobby:leave] ${socket.id} leaving lobby: ${gameId}`)
    
    socket.leave(`lobby:${gameId}`)
    
    if (playerId) {
      socket.to(`lobby:${gameId}`).emit('lobby:playerLeft', playerId)
    }
    
    console.log(`✅ [lobby:leave] ${socket.id} successfully left lobby: ${gameId}`)
  })

  socket.on('lobby:startCountdown', ({ gameId, playerId }) => {
    console.log(`⏰ [lobby:startCountdown] ${socket.id} starting countdown for: ${gameId}`)
    
    // Vérifier que le joueur est le host
    GameModel.findById(gameId).then(game => {
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      
      if (game.host?.toString() !== playerId) {
        socket.emit('error', { message: 'Only the host can start the game' })
        return
      }
      
      // Notifier tous les joueurs du lobby
      getIO().to(`lobby:${gameId}`).emit('lobby:countdownStarted')
      console.log(`✅ [lobby:startCountdown] Countdown started for game: ${gameId}`)
    }).catch(error => {
      console.error('[lobby:startCountdown] Error:', error)
      socket.emit('error', { message: 'Failed to start countdown' })
    })
  })

  socket.on('lobby:cancelCountdown', ({ gameId, playerId }) => {
    console.log(`❌ [lobby:cancelCountdown] ${socket.id} cancelling countdown for: ${gameId}`)
    
    // Vérifier que le joueur est le host
    GameModel.findById(gameId).then(game => {
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      
      if (game.host?.toString() !== playerId) {
        socket.emit('error', { message: 'Only the host can cancel the countdown' })
        return
      }
      
      // Notifier tous les joueurs du lobby
      getIO().to(`lobby:${gameId}`).emit('lobby:countdownCancelled')
      console.log(`✅ [lobby:cancelCountdown] Countdown cancelled for game: ${gameId}`)
    }).catch(error => {
      console.error('[lobby:cancelCountdown] Error:', error)
      socket.emit('error', { message: 'Failed to cancel countdown' })
    })
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
