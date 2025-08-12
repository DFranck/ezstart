import type { Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions'
import { getIO } from '../socketInstance'
import { getGameTicker } from '../tickers/getGameTicker'
import { syncTickerWithDatabase, ticker } from '../tickers/tickerEngine'
import { GameModel } from '../models/Game'
import { PlayerModel } from '../models/Player'
import { updatePlayerStatusService } from '../services/updatePlayerStatusService'

// Map pour tracker les connexions actives
const activeConnections = new Map<string, { socketId: string; gameId: string; playerId: string }>()

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
      
      // Tracker la connexion
      activeConnections.set(socket.id, { socketId: socket.id, gameId, playerId })
      
      // Si le joueur était déconnecté, le remettre actif
      if (playerId) {
        const gamePlayer = game.players.find(p => p.playerId.toString() === playerId)
        if (gamePlayer && gamePlayer.status === 'disconnected') {
          await updatePlayerStatusService({ gameId, playerId, status: 'active' })
          socket.to(`lobby:${gameId}`).emit('lobby:playerStatusChanged', { 
            playerId, 
            status: 'active',
            message: `${gamePlayer.name} reconnected`
          })
        } else {
          // Nouveau joueur qui rejoint
          const player = await PlayerModel.findById(playerId)
          socket.to(`lobby:${gameId}`).emit('lobby:playerJoined', {
            _id: playerId,
            name: player?.name || `Player ${playerId.slice(0, 6)}`
          })
        }
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
    activeConnections.delete(socket.id)
    
    if (playerId) {
      socket.to(`lobby:${gameId}`).emit('lobby:playerLeft', playerId)
    }
    
    console.log(`✅ [lobby:leave] ${socket.id} successfully left lobby: ${gameId}`)
  })

  socket.on('lobby:reconnect', async ({ gameId, playerId }) => {
    console.log(`🔄 [lobby:reconnect] ${socket.id} reconnecting to game: ${gameId}`)
    
    try {
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }
      
      const player = game.players.find(p => p.playerId.toString() === playerId)
      if (!player) {
        socket.emit('error', { message: 'Player not found in game' })
        return
      }
      
      // Rejoindre les rooms appropriées
      socket.join(`lobby:${gameId}`)
      socket.join(gameId)
      
      // Tracker la connexion
      activeConnections.set(socket.id, { socketId: socket.id, gameId, playerId })
      
      // Mettre à jour le statut
      if (player.status === 'disconnected') {
        await updatePlayerStatusService({ gameId, playerId, status: 'active' })
        
        // Notifier les autres joueurs
        const event = game.phase === 'waiting' ? 'lobby:playerStatusChanged' : 'playerStatusChanged'
        socket.to(gameId).emit(event, { 
          playerId, 
          status: 'active',
          message: `${player.name} reconnected`
        })
      }
      
      console.log(`✅ [lobby:reconnect] ${socket.id} successfully reconnected to game: ${gameId}`)
      
    } catch (error) {
      console.error('[lobby:reconnect] Error:', error)
      socket.emit('error', { message: 'Failed to reconnect' })
    }
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

  // Gestion des déconnexions
  socket.on('disconnect', async () => {
    console.log(`❌ [socket] Disconnected: ${socket.id}`)
    
    const connection = activeConnections.get(socket.id)
    if (connection) {
      const { gameId, playerId } = connection
      
      try {
        // Marquer le joueur comme déconnecté (pas supprimer)
        await updatePlayerStatusService({ gameId, playerId, status: 'disconnected' })
        
        // Notifier les autres joueurs
        const game = await GameModel.findById(gameId)
        if (game) {
          const player = game.players.find(p => p.playerId.toString() === playerId)
          const event = game.phase === 'waiting' ? 'lobby:playerStatusChanged' : 'playerStatusChanged'
          
          socket.to(gameId).emit(event, { 
            playerId, 
            status: 'disconnected',
            message: `${player?.name || 'Player'} disconnected`
          })
        }
        
        console.log(`🔌 [disconnect] Player ${playerId} marked as disconnected in game ${gameId}`)
      } catch (error) {
        console.error('[disconnect] Error updating player status:', error)
      }
      
      activeConnections.delete(socket.id)
    }
  })
}
