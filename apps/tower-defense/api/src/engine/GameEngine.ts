/**
 * GameEngine - Main game loop orchestration
 */

import { gameManager } from '../managers/GameManager.js'
import { getIO } from '../socketInstance.js'
import { MovementSystem } from '../systems/MovementSystem.js'
import { TowerSystem } from '../systems/TowerSystem.js'

class GameEngine {
  private tickIntervals = new Map<string, NodeJS.Timeout>()

  startGame(gameId: string): void {
    const game = gameManager.getGame(gameId)
    if (!game) throw new Error(`Game ${gameId} not found`)

    gameManager.startGame(gameId)

    const interval = setInterval(() => this.tick(gameId), 250) // 4 Hz
    this.tickIntervals.set(gameId, interval)

    console.log(`[GameEngine] Started game ${gameId}`)
  }

  stopGame(gameId: string): void {
    const interval = this.tickIntervals.get(gameId)
    if (interval) {
      clearInterval(interval)
      this.tickIntervals.delete(gameId)
    }

    gameManager.finishGame(gameId)
    console.log(`[GameEngine] Stopped game ${gameId}`)
  }

  private tick(gameId: string): void {
    const game = gameManager.getGame(gameId)
    if (!game || game.phase !== 'playing') return

    const startTime = performance.now()

    // Run all systems
    MovementSystem.update(game)
    TowerSystem.update(game)

    // Increment tick
    gameManager.incrementTick(gameId)

    // Emit state to clients
    this.emitGameState(gameId)

    // Performance monitoring
    const tickTime = performance.now() - startTime
    if (tickTime > 200) {
      console.warn(`⚠️  Slow tick: ${tickTime.toFixed(2)}ms for game ${gameId}`)
    }
  }

  private emitGameState(gameId: string): void {
    const game = gameManager.getGame(gameId)
    if (!game) return

    const io = getIO()

    const state = {
      tick: game.tick,
      players: Array.from(game.players.values()),
      mobs: game.mobs.getAll(),
      towers: game.towers.getAll(),
    }

    io.to(`game-${gameId}`).emit('gameState', state)
  }
}

export const gameEngine = new GameEngine()
