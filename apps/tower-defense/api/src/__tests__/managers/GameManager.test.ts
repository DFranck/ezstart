import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { gameManager } from '../../managers/GameManager.js'
import type { PlayerInstance, GameInstance } from '../../managers/GameManager.js'
import type { ActiveMob, PlacedTower } from '@tower-defense/types'

describe('GameManager', () => {
  const testHostId = 'host-123'
  const testPlayerId = 'player-456'

  beforeEach(() => {
    // Clear all games before each test
    const games = gameManager.getAllGames()
    games.forEach(game => gameManager.deleteGame(game.id))
  })

  afterEach(() => {
    // Clean up after each test
    const games = gameManager.getAllGames()
    games.forEach(game => gameManager.deleteGame(game.id))
  })

  describe('createGame', () => {
    it('should create a new game with generated ID', () => {
      const game = gameManager.createGame(testHostId)

      expect(game).toBeDefined()
      expect(game.id).toBeDefined()
      expect(game.hostId).toBe(testHostId)
      expect(game.phase).toBe('waiting')
      expect(game.tick).toBe(0)
      expect(game.players.size).toBe(0)
    })

    it('should create game with custom ID', () => {
      const customId = 'custom-game-id'
      const game = gameManager.createGame(testHostId, customId)

      expect(game.id).toBe(customId)
    })

    it('should initialize empty spatial grids', () => {
      const game = gameManager.createGame(testHostId)

      expect(game.mobs.size).toBe(0)
      expect(game.towers.size).toBe(0)
    })

    it('should set createdAt timestamp', () => {
      const before = Date.now()
      const game = gameManager.createGame(testHostId)
      const after = Date.now()

      expect(game.createdAt).toBeGreaterThanOrEqual(before)
      expect(game.createdAt).toBeLessThanOrEqual(after)
    })
  })

  describe('getGame', () => {
    it('should return existing game', () => {
      const created = gameManager.createGame(testHostId)
      const retrieved = gameManager.getGame(created.id)

      expect(retrieved).toBe(created)
    })

    it('should return undefined for non-existent game', () => {
      const game = gameManager.getGame('non-existent-id')

      expect(game).toBeUndefined()
    })
  })

  describe('deleteGame', () => {
    it('should delete existing game', () => {
      const game = gameManager.createGame(testHostId)
      gameManager.deleteGame(game.id)

      const retrieved = gameManager.getGame(game.id)
      expect(retrieved).toBeUndefined()
    })

    it('should handle deleting non-existent game gracefully', () => {
      expect(() => {
        gameManager.deleteGame('non-existent-id')
      }).not.toThrow()
    })

    it('should clear spatial grids when deleting', () => {
      const game = gameManager.createGame(testHostId)

      // Add some entities
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }
      gameManager.addPlayer(game.id, player)

      gameManager.deleteGame(game.id)

      const retrieved = gameManager.getGame(game.id)
      expect(retrieved).toBeUndefined()
    })
  })

  describe('getAllGames', () => {
    it('should return empty array when no games', () => {
      const games = gameManager.getAllGames()

      expect(games).toEqual([])
    })

    it('should return all games', () => {
      gameManager.createGame('host-1')
      gameManager.createGame('host-2')
      gameManager.createGame('host-3')

      const games = gameManager.getAllGames()

      expect(games).toHaveLength(3)
    })
  })

  describe('getGamesByPhase', () => {
    it('should return only waiting games', () => {
      const game1 = gameManager.createGame('host-1')
      const game2 = gameManager.createGame('host-2')
      const game3 = gameManager.createGame('host-3')

      gameManager.startGame(game2.id)

      const waitingGames = gameManager.getGamesByPhase('waiting')

      expect(waitingGames).toHaveLength(2)
      expect(waitingGames.some(g => g.id === game1.id)).toBe(true)
      expect(waitingGames.some(g => g.id === game3.id)).toBe(true)
    })

    it('should return only playing games', () => {
      const game1 = gameManager.createGame('host-1')
      const game2 = gameManager.createGame('host-2')

      gameManager.startGame(game1.id)
      gameManager.startGame(game2.id)

      const playingGames = gameManager.getGamesByPhase('playing')

      expect(playingGames).toHaveLength(2)
    })

    it('should return only finished games', () => {
      const game = gameManager.createGame('host-1')
      gameManager.startGame(game.id)
      gameManager.finishGame(game.id)

      const finishedGames = gameManager.getGamesByPhase('finished')

      expect(finishedGames).toHaveLength(1)
      expect(finishedGames[0]!.id).toBe(game.id)
    })
  })

  describe('addPlayer', () => {
    it('should add player to game', () => {
      const game = gameManager.createGame(testHostId)
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      gameManager.addPlayer(game.id, player)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.players.size).toBe(1)
      expect(retrievedGame?.players.get(testPlayerId)).toEqual(player)
    })

    it('should throw if game not found', () => {
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      expect(() => {
        gameManager.addPlayer('non-existent', player)
      }).toThrow('Game non-existent not found')
    })
  })

  describe('removePlayer', () => {
    it('should remove player from game', () => {
      const game = gameManager.createGame(testHostId)
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      gameManager.addPlayer(game.id, player)
      gameManager.removePlayer(game.id, testPlayerId)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame).toBeUndefined() // Game deleted when last player leaves
    })

    it('should delete game when last player leaves', () => {
      const game = gameManager.createGame(testHostId)
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      gameManager.addPlayer(game.id, player)
      gameManager.removePlayer(game.id, testPlayerId)

      expect(gameManager.getGame(game.id)).toBeUndefined()
    })

    it('should handle removing from non-existent game gracefully', () => {
      expect(() => {
        gameManager.removePlayer('non-existent', testPlayerId)
      }).not.toThrow()
    })
  })

  describe('updatePlayer', () => {
    it('should update player fields', () => {
      const game = gameManager.createGame(testHostId)
      const player: PlayerInstance = {
        id: testPlayerId,
        name: 'Test Player',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      gameManager.addPlayer(game.id, player)
      gameManager.updatePlayer(game.id, testPlayerId, { gold: 750, tier: 2 })

      const updated = gameManager.getGame(game.id)?.players.get(testPlayerId)
      expect(updated?.gold).toBe(750)
      expect(updated?.tier).toBe(2)
      expect(updated?.hp).toBe(100) // Unchanged
    })

    it('should throw if game not found', () => {
      expect(() => {
        gameManager.updatePlayer('non-existent', testPlayerId, { gold: 100 })
      }).toThrow('Game non-existent not found')
    })

    it('should throw if player not in game', () => {
      const game = gameManager.createGame(testHostId)

      expect(() => {
        gameManager.updatePlayer(game.id, 'non-existent-player', { gold: 100 })
      }).toThrow('Player non-existent-player not in game')
    })
  })

  describe('spawnMob', () => {
    it('should add mob to game', () => {
      const game = gameManager.createGame(testHostId)
      const mob: ActiveMob = {
        id: 'mob-1',
        mobTypeId: 'basic-slime',
        currentHp: 30,
        position: { x: 0, y: 0 },
        pathIndex: 0,
        targetPlayerId: testPlayerId,
      }

      gameManager.spawnMob(game.id, mob)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.mobs.size).toBe(1)
    })

    it('should throw if game not found', () => {
      const mob: ActiveMob = {
        id: 'mob-1',
        mobTypeId: 'basic-slime',
        currentHp: 30,
        position: { x: 0, y: 0 },
        pathIndex: 0,
        targetPlayerId: testPlayerId,
      }

      expect(() => {
        gameManager.spawnMob('non-existent', mob)
      }).toThrow('Game non-existent not found')
    })
  })

  describe('startGame', () => {
    it('should change phase to playing', () => {
      const game = gameManager.createGame(testHostId)
      gameManager.startGame(game.id)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.phase).toBe('playing')
      expect(retrievedGame?.startedAt).toBeDefined()
    })

    it('should throw if game not found', () => {
      expect(() => {
        gameManager.startGame('non-existent')
      }).toThrow('Game non-existent not found')
    })
  })

  describe('finishGame', () => {
    it('should change phase to finished', () => {
      const game = gameManager.createGame(testHostId)
      gameManager.finishGame(game.id)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.phase).toBe('finished')
    })

    it('should handle non-existent game gracefully', () => {
      expect(() => {
        gameManager.finishGame('non-existent')
      }).not.toThrow()
    })
  })

  describe('incrementTick', () => {
    it('should increment tick counter', () => {
      const game = gameManager.createGame(testHostId)
      gameManager.incrementTick(game.id)
      gameManager.incrementTick(game.id)

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.tick).toBe(2)
    })

    it('should update lastTickTime', () => {
      const game = gameManager.createGame(testHostId)
      const before = Date.now()
      gameManager.incrementTick(game.id)
      const after = Date.now()

      const retrievedGame = gameManager.getGame(game.id)
      expect(retrievedGame?.lastTickTime).toBeGreaterThanOrEqual(before)
      expect(retrievedGame?.lastTickTime).toBeLessThanOrEqual(after)
    })
  })

  describe('getStats', () => {
    it('should return correct stats', () => {
      const game1 = gameManager.createGame('host-1')
      const game2 = gameManager.createGame('host-2')

      const player1: PlayerInstance = {
        id: 'player-1',
        name: 'Player 1',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      const player2: PlayerInstance = {
        id: 'player-2',
        name: 'Player 2',
        hp: 100,
        gold: 500,
        income: 10,
        tier: 1,
        goldSpent: 0,
        isAlive: true,
      }

      gameManager.addPlayer(game1.id, player1)
      gameManager.addPlayer(game2.id, player2)
      gameManager.startGame(game1.id)

      const stats = gameManager.getStats()

      expect(stats.totalGames).toBe(2)
      expect(stats.waitingGames).toBe(1)
      expect(stats.playingGames).toBe(1)
      expect(stats.totalPlayers).toBe(2)
    })
  })
})
