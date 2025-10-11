/**
 * GameManager - Centralized in-memory game state management
 *
 * Manages all active games with O(1) lookups and mutations.
 * No database queries in the game loop - all state in memory.
 */

import { SpatialGrid } from '../engine/SpatialGrid.js'
import { ActiveMob, PlacedTower, Position } from '@tower-defense/types'
import { Types } from 'mongoose'

export interface PlayerInstance {
  id: string
  name: string
  hp: number
  gold: number
  income: number
  tier: number
  goldSpent: number
  isAlive: boolean
  socketId?: string
}

// Wrapper for PlacedTower to work with SpatialGrid (uses origin as position)
export interface TowerWithPosition extends PlacedTower {
  position: Position // Alias for origin
}

export interface GameInstance {
  id: string
  hostId: string
  players: Map<string, PlayerInstance>
  mobs: SpatialGrid<ActiveMob>
  towers: SpatialGrid<TowerWithPosition>
  tick: number
  phase: 'waiting' | 'playing' | 'finished'
  createdAt: number
  lastTickTime?: number
  startedAt?: number
}

class GameManager {
  private games = new Map<string, GameInstance>()

  /**
   * Create a new game instance
   * Time: O(1)
   */
  createGame(hostId: string, gameId?: string): GameInstance {
    const game: GameInstance = {
      id: gameId || new Types.ObjectId().toString(),
      hostId,
      players: new Map(),
      mobs: new SpatialGrid<ActiveMob>(5), // 5-tile cells
      towers: new SpatialGrid<TowerWithPosition>(5),
      tick: 0,
      phase: 'waiting',
      createdAt: Date.now(),
    }

    this.games.set(game.id, game)
    console.log(`[GameManager] Created game ${game.id}`)
    return game
  }

  /**
   * Get game by ID
   * Time: O(1)
   */
  getGame(id: string): GameInstance | undefined {
    return this.games.get(id)
  }

  /**
   * Delete game (cleanup after finished)
   * Time: O(1)
   */
  deleteGame(id: string): void {
    const game = this.games.get(id)
    if (game) {
      game.mobs.clear()
      game.towers.clear()
      game.players.clear()
      this.games.delete(id)
      console.log(`[GameManager] Deleted game ${id}`)
    }
  }

  /**
   * Get all games (for lobby list)
   * Time: O(n)
   */
  getAllGames(): GameInstance[] {
    return Array.from(this.games.values())
  }

  /**
   * Get games by phase
   * Time: O(n)
   */
  getGamesByPhase(phase: 'waiting' | 'playing' | 'finished'): GameInstance[] {
    return Array.from(this.games.values()).filter(g => g.phase === phase)
  }

  /**
   * Add player to game
   * Time: O(1)
   */
  addPlayer(gameId: string, player: PlayerInstance): void {
    const game = this.games.get(gameId)
    if (!game) {
      throw new Error(`Game ${gameId} not found`)
    }

    game.players.set(player.id, player)
    console.log(`[GameManager] Player ${player.name} joined game ${gameId}`)
  }

  /**
   * Remove player from game
   * Time: O(1)
   */
  removePlayer(gameId: string, playerId: string): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.players.delete(playerId)
    console.log(`[GameManager] Player ${playerId} left game ${gameId}`)

    // Delete game if empty
    if (game.players.size === 0) {
      this.deleteGame(gameId)
    }
  }

  /**
   * Update player in game
   * Time: O(1)
   */
  updatePlayer(gameId: string, playerId: string, updates: Partial<PlayerInstance>): void {
    const game = this.games.get(gameId)
    if (!game) throw new Error(`Game ${gameId} not found`)

    const player = game.players.get(playerId)
    if (!player) throw new Error(`Player ${playerId} not in game`)

    Object.assign(player, updates)
  }

  /**
   * Spawn mob in game
   * Time: O(1)
   */
  spawnMob(gameId: string, mob: ActiveMob): void {
    const game = this.games.get(gameId)
    if (!game) throw new Error(`Game ${gameId} not found`)

    game.mobs.insert(mob)
  }

  /**
   * Remove mob from game
   * Time: O(1)
   */
  removeMob(gameId: string, mobId: string): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.mobs.remove(mobId)
  }

  /**
   * Update mob position
   * Time: O(1)
   */
  updateMob(gameId: string, mob: ActiveMob): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.mobs.update(mob)
  }

  /**
   * Place tower in game
   * Time: O(1)
   */
  placeTower(gameId: string, tower: PlacedTower): void {
    const game = this.games.get(gameId)
    if (!game) throw new Error(`Game ${gameId} not found`)

    // Wrap tower to add position field (alias for origin)
    const towerWithPos: TowerWithPosition = {
      ...tower,
      position: tower.origin,
    }

    game.towers.insert(towerWithPos)
  }

  /**
   * Remove tower from game
   * Time: O(1)
   */
  removeTower(gameId: string, towerId: string): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.towers.remove(towerId)
  }

  /**
   * Start game (change phase)
   * Time: O(1)
   */
  startGame(gameId: string): void {
    const game = this.games.get(gameId)
    if (!game) throw new Error(`Game ${gameId} not found`)

    game.phase = 'playing'
    game.startedAt = Date.now()
    console.log(`[GameManager] Started game ${gameId}`)
  }

  /**
   * Finish game
   * Time: O(1)
   */
  finishGame(gameId: string): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.phase = 'finished'
    console.log(`[GameManager] Finished game ${gameId}`)
  }

  /**
   * Increment game tick
   * Time: O(1)
   */
  incrementTick(gameId: string): void {
    const game = this.games.get(gameId)
    if (!game) return

    game.tick++
    game.lastTickTime = Date.now()
  }

  /**
   * Get statistics
   */
  getStats() {
    const games = Array.from(this.games.values())
    return {
      totalGames: this.games.size,
      waitingGames: games.filter(g => g.phase === 'waiting').length,
      playingGames: games.filter(g => g.phase === 'playing').length,
      finishedGames: games.filter(g => g.phase === 'finished').length,
      totalPlayers: games.reduce((sum, g) => sum + g.players.size, 0),
      totalMobs: games.reduce((sum, g) => sum + g.mobs.size, 0),
      totalTowers: games.reduce((sum, g) => sum + g.towers.size, 0),
    }
  }
}

// Singleton instance
export const gameManager = new GameManager()
