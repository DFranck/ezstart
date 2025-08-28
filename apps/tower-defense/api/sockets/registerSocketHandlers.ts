import { logger } from '@ezstart/ui/lib'
import type { Socket } from 'socket.io'
import { handleGameAction } from '../handlers/gameActions.js'
import { GameModel } from '../models/Game.js'
import { InGamePlayerModel } from '../models/InGamePlayer.js'
import { PlayerModel } from '../models/Player.js'
import { updatePlayerStatusService } from '../services/updatePlayerStatusService.js'
import { getIO } from '../socketInstance.js'
import { getGameTicker } from '../tickers/getGameTicker.js'
import { syncTickerWithDatabase, ticker } from '../tickers/tickerEngine.js'

// Map pour tracker les connexions actives
const activeConnections = new Map<string, { socketId: string; gameId: string; playerId: string }>()

// Map pour tracker les countdowns actifs et éviter les annulations multiples
const activeCountdowns = new Set<string>()

// Map pour tracker les ready checks actifs
const activeReadyChecks = new Map<string, Set<string>>()

export function registerSocketHandlers(socket: Socket) {
  // Lobby handlers
  socket.on('lobby:join', async ({ gameId, playerId }) => {
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

      // Vérifier si le socket est déjà dans la room
      const rooms = Array.from(socket.rooms)
      if (rooms.includes(`lobby:${gameId}`)) {
        return
      }

      // Rejoindre la room du lobby
      socket.join(`lobby:${gameId}`)

      // Tracker la connexion
      activeConnections.set(socket.id, { socketId: socket.id, gameId, playerId })

      // Gérer le statut du joueur qui rejoint
      if (playerId) {
        const gamePlayer = await InGamePlayerModel.findOne({ gameId, player: playerId })
        if (gamePlayer && (gamePlayer.status === 'disconnected' || gamePlayer.status === 'left')) {
          // Joueur qui revient après déconnexion ou après avoir quitté
          await updatePlayerStatusService({ gameId, playerId, status: 'active' })
          const player = await PlayerModel.findById(playerId)
          const message = gamePlayer.status === 'disconnected' ? 'reconnected' : 'rejoined'
          socket.to(`lobby:${gameId}`).emit('lobby:playerStatusChanged', {
            playerId,
            status: 'active',
            message: `${player?.name || 'Player'} ${message}`,
          })
        } else if (!gamePlayer) {
          // Nouveau joueur qui rejoint pour la première fois - chercher son InGamePlayer complet
          const inGamePlayer = await InGamePlayerModel.findOne({ gameId, player: playerId }).populate('player').exec()
          if (inGamePlayer) {
            socket.to(`lobby:${gameId}`).emit('lobby:playerJoined', inGamePlayer)
          }
        }
      }

      // Récupérer et envoyer la liste complète des InGamePlayers
      const inGamePlayers = await InGamePlayerModel.find({ gameId }).populate('player').exec()
      getIO().to(`lobby:${gameId}`).emit('lobby:playersUpdated', inGamePlayers)
    } catch (error) {
      logger.error('[lobby:join] Error:', error)
      socket.emit('error', { message: 'Failed to join lobby' })
    }
  })

  socket.on('lobby:leave', async ({ gameId, playerId }) => {
    try {
      // Vérifier si le socket est dans la room avant de la quitter
      const rooms = Array.from(socket.rooms)
      if (!rooms.includes(`lobby:${gameId}`)) {
        return
      }

      socket.leave(`lobby:${gameId}`)
      activeConnections.delete(socket.id)

      if (playerId) {
        // Marquer le joueur comme ayant quitté seulement si la game est encore en attente
        const game = await GameModel.findById(gameId)
        if (game && game.phase === 'waiting') {
          await updatePlayerStatusService({ gameId, playerId, status: 'left' })
        }
        
        // Nettoyer le ready check si actif
        const readyPlayers = activeReadyChecks.get(gameId)
        if (readyPlayers) {
          readyPlayers.delete(playerId)
          getIO().to(`lobby:${gameId}`).emit('lobby:playerReadyUpdate', {
            playerId,
            ready: false,
            readyPlayerIds: Array.from(readyPlayers)
          })
        }
        
        // Notifier les autres joueurs
        socket.to(`lobby:${gameId}`).emit('lobby:playerLeft', playerId)
        
        // Envoyer la liste mise à jour
        const inGamePlayers = await InGamePlayerModel.find({ gameId }).populate('player').exec()
        getIO().to(`lobby:${gameId}`).emit('lobby:playersUpdated', inGamePlayers)
      }
    } catch (error) {
      logger.error('[lobby:leave] Error:', error)
    }
  })

  socket.on('lobby:reconnect', async ({ gameId, playerId }) => {
    // Reconnecting silently

    try {
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      const gamePlayer = await InGamePlayerModel.findOne({ gameId, player: playerId })
      if (!gamePlayer) {
        socket.emit('error', { message: 'Player not found in game' })
        return
      }

      // Rejoindre les rooms appropriées
      socket.join(`lobby:${gameId}`)
      socket.join(gameId)

      // Tracker la connexion
      activeConnections.set(socket.id, { socketId: socket.id, gameId, playerId })

      // Mettre à jour le statut
      if (gamePlayer.status === 'disconnected') {
        await updatePlayerStatusService({ gameId, playerId, status: 'active' })

        // Notifier les autres joueurs
        const player = await PlayerModel.findById(playerId)
        const event = game.phase === 'waiting' ? 'lobby:playerStatusChanged' : 'playerStatusChanged'
        const room = game.phase === 'waiting' ? `lobby:${gameId}` : gameId
        socket.to(room).emit(event, {
          playerId,
          status: 'active',
          message: `${player?.name || 'Player'} reconnected`,
        })
      }

      // Successfully reconnected
    } catch (error) {
      logger.error('[lobby:reconnect] Error:', error)
      socket.emit('error', { message: 'Failed to reconnect' })
    }
  })

  socket.on('lobby:startCountdown', ({ gameId, playerId }) => {
    logger.debug(`⏰ [lobby:startCountdown] ${socket.id} starting countdown for: ${gameId}`)

    // Vérifier que le joueur est le host
    GameModel.findById(gameId)
      .then(game => {
        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          return
        }

        if (game.host?.toString() !== playerId) {
          socket.emit('error', { message: 'Only the host can start the game' })
          return
        }

        // Notifier tous les joueurs du lobby (y compris l'émetteur)
        getIO().to(`lobby:${gameId}`).emit('lobby:countdownStarted')
        socket.emit('lobby:countdownStarted') // S'assurer que l'émetteur reçoit aussi
        logger.debug(`✅ [lobby:startCountdown] Countdown started for game: ${gameId}`)
      })
      .catch(error => {
        logger.error('[lobby:startCountdown] Error:', error)
        socket.emit('error', { message: 'Failed to start countdown' })
      })
  })

  socket.on('lobby:cancelCountdown', ({ gameId, playerId }) => {
    // Éviter les annulations multiples pour le même jeu
    if (activeCountdowns.has(gameId)) {
      return
    }

    activeCountdowns.add(gameId)
    logger.debug(`❌ [lobby:cancelCountdown] ${socket.id} cancelling countdown for: ${gameId}`)

    // Vérifier que le joueur est le host
    GameModel.findById(gameId)
      .then(game => {
        if (!game) {
          socket.emit('error', { message: 'Game not found' })
          activeCountdowns.delete(gameId)
          return
        }

        if (game.host?.toString() !== playerId) {
          socket.emit('error', { message: 'Only the host can cancel the countdown' })
          activeCountdowns.delete(gameId)
          return
        }

        // Notifier tous les joueurs du lobby (y compris l'émetteur)
        getIO().to(`lobby:${gameId}`).emit('lobby:countdownCancelled')
        socket.emit('lobby:countdownCancelled') // S'assurer que l'émetteur reçoit aussi
        logger.debug(`✅ [lobby:cancelCountdown] Countdown cancelled for game: ${gameId}`)

        // Retirer du set après un délai pour permettre de nouveaux countdowns
        setTimeout(() => {
          activeCountdowns.delete(gameId)
        }, 1000)
      })
      .catch(error => {
        logger.error('[lobby:cancelCountdown] Error:', error)
        socket.emit('error', { message: 'Failed to cancel countdown' })
        activeCountdowns.delete(gameId)
      })
  })

  // Ready check handlers
  socket.on('lobby:startReadyCheck', async ({ gameId, playerId }) => {
    logger.debug(`✓ [lobby:startReadyCheck] ${socket.id} starting ready check for: ${gameId}`)

    try {
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      if (game.host?.toString() !== playerId) {
        socket.emit('error', { message: 'Only the host can start ready check' })
        return
      }

      // Initialiser le ready check pour cette partie
      activeReadyChecks.set(gameId, new Set())

      // Notifier tous les joueurs du lobby (y compris l'émetteur)
      const socketsInRoom = await getIO().in(`lobby:${gameId}`).fetchSockets()
      logger.debug(`🔍 [lobby:startReadyCheck] Sockets in room lobby:${gameId}: ${socketsInRoom.length}`)
      
      getIO().to(`lobby:${gameId}`).emit('lobby:readyCheckStarted')
      socket.emit('lobby:readyCheckStarted') // S'assurer que l'host reçoit aussi l'événement
      logger.debug(`✅ [lobby:startReadyCheck] Ready check started for game: ${gameId}`)
    } catch (error) {
      logger.error('[lobby:startReadyCheck] Error:', error)
      socket.emit('error', { message: 'Failed to start ready check' })
    }
  })

  socket.on('lobby:cancelReadyCheck', async ({ gameId, playerId }) => {
    logger.debug(`❌ [lobby:cancelReadyCheck] ${socket.id} cancelling ready check for: ${gameId}`)

    try {
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      if (game.host?.toString() !== playerId) {
        socket.emit('error', { message: 'Only the host can cancel ready check' })
        return
      }

      // Supprimer le ready check
      activeReadyChecks.delete(gameId)

      // Notifier tous les joueurs du lobby (y compris l'émetteur)
      getIO().to(`lobby:${gameId}`).emit('lobby:readyCheckCancelled')
      socket.emit('lobby:readyCheckCancelled') // S'assurer que l'host reçoit aussi l'événement
      logger.debug(`✅ [lobby:cancelReadyCheck] Ready check cancelled for game: ${gameId}`)
    } catch (error) {
      logger.error('[lobby:cancelReadyCheck] Error:', error)
      socket.emit('error', { message: 'Failed to cancel ready check' })
    }
  })

  socket.on('lobby:playerReady', ({ gameId, playerId, ready }) => {
    logger.debug(`👍 [lobby:playerReady] ${socket.id} player ${playerId} ready: ${ready}`)

    const readyPlayers = activeReadyChecks.get(gameId)
    if (!readyPlayers) {
      socket.emit('error', { message: 'No active ready check' })
      return
    }

    // Mettre à jour l'état du joueur
    if (ready) {
      readyPlayers.add(playerId)
    } else {
      readyPlayers.delete(playerId)
    }

    // Notifier tous les joueurs de la mise à jour
    getIO().to(`lobby:${gameId}`).emit('lobby:playerReadyUpdate', {
      playerId,
      ready,
      readyPlayerIds: Array.from(readyPlayers)
    })

    logger.debug(`✅ [lobby:playerReady] Updated ready state for game ${gameId}: ${readyPlayers.size} players ready`)
  })

  // Game handlers
  socket.on('game:join', async ({ gameId }) => {
    // Joining game silently

    try {
      const game = await GameModel.findById(gameId)
      if (!game) {
        socket.emit('error', { message: 'Game not found' })
        return
      }

      // Rejoindre la room du jeu
      socket.join(gameId)

      // Si le jeu est en cours, envoyer l'état actuel du ticker
      if (game.phase === 'playing') {
        // S'assurer que la room existe
        ticker.ensureRoom(gameId)
        
        const gameTicker = getGameTicker(gameId)
        const gameState = gameTicker?.getState()
        
        if (gameState && gameState._id) {
          // État ticker valide - envoyer directement
          socket.emit('gameState', { ...gameState, _reason: 'game:join' })
        } else {
          // Ticker vide (serveur redémarré?) - sync depuis DB puis envoyer
          console.warn(`[game:join] Ticker empty for active game ${gameId} - syncing from DB`)
          await syncTickerWithDatabase(gameId)
          
          const refreshedState = getGameTicker(gameId)?.getState()
          if (refreshedState) {
            socket.emit('gameState', { ...refreshedState, _reason: 'game:join' })
          } else {
            logger.error(`[game:join] Failed to restore game state for ${gameId}`)
            socket.emit('error', { message: 'Game state unavailable' })
          }
        }
      }

      // Successfully joined game
    } catch (error) {
      logger.error('[game:join] Error:', error)
      socket.emit('error', { message: 'Failed to join game' })
    }
  })

  socket.on('game:leave', ({ gameId }) => {
    logger.debug(`🚪 [game:leave] ${socket.id} leaving game: ${gameId}`)
    socket.leave(gameId)
  })

  // Game action handlers
  socket.on('gameAction', async ({ gameId, action }) => {
    // S'assurer que la room existe
    ticker.ensureRoom(gameId)
    
    // Pas de sync DB pendant le gameplay - tout reste en mémoire

    console.log(`[Action] ${action.type} game ${gameId.slice(-6)}`)
    const result = await handleGameAction(gameId, action)

    if (!result.success) {
      const reason = 'reason' in result ? result.reason : 'Unknown error'
      console.log(`[Action] ❌ ${action.type} rejected: ${reason}`)
      socket.emit('actionRejected', { reason })
      return
    }

    const newState = getGameTicker(gameId)?.getState()
    if (!newState) {
      return
    }

    console.log(`[Action] ✅ ${action.type} success - tick ${newState.tick}, ${newState.activeMobs?.length || 0} mobs`)
    getIO().to(gameId).emit('gameState', { ...newState, _reason: `gameAction:${action.type}` })
  })

  // Gestion des déconnexions
  socket.on('disconnect', async () => {
    const connection = activeConnections.get(socket.id)
    if (connection) {
      const { gameId, playerId } = connection

      try {
        // Marquer le joueur comme déconnecté (pas supprimer)
        await updatePlayerStatusService({ gameId, playerId, status: 'disconnected' })

        // Nettoyer le ready check si actif
        const readyPlayers = activeReadyChecks.get(gameId)
        if (readyPlayers) {
          readyPlayers.delete(playerId)
          getIO().to(`lobby:${gameId}`).emit('lobby:playerReadyUpdate', {
            playerId,
            ready: false,
            readyPlayerIds: Array.from(readyPlayers)
          })
        }

        // Notifier les autres joueurs
        const game = await GameModel.findById(gameId)
        if (game) {
          const player = await PlayerModel.findById(playerId)
          const event =
            game.phase === 'waiting' ? 'lobby:playerStatusChanged' : 'playerStatusChanged'
          const room = game.phase === 'waiting' ? `lobby:${gameId}` : gameId

          socket.to(room).emit(event, {
            playerId,
            status: 'disconnected',
            message: `${player?.name || 'Player'} disconnected`,
          })
        }
      } catch (error) {
        logger.error('[disconnect] Error updating player status:', error)
      }

      activeConnections.delete(socket.id)
    }
  })
}
