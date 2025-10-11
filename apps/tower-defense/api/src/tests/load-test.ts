/**
 * Load Testing Script for Tower Defense
 * Simulates 8+ concurrent players to test server performance
 *
 * Usage:
 *   pnpm tsx src/tests/load-test.ts
 *   NUM_PLAYERS=16 pnpm tsx src/tests/load-test.ts
 *   API_URL=https://api.prod.com NUM_PLAYERS=20 pnpm tsx src/tests/load-test.ts
 */

import { io, type Socket } from 'socket.io-client'

const API_URL = process.env.API_URL || 'http://localhost:5030'
const NUM_PLAYERS = parseInt(process.env.NUM_PLAYERS || '8', 10)
const TEST_DURATION_MS = parseInt(process.env.TEST_DURATION_MS || '60000', 10)

interface TestPlayer {
  id: string
  name: string
  socket: Socket
  gameId: string | null
  actions: number
  errors: number
}

const players: TestPlayer[] = []
const stats = {
  gamesCreated: 0,
  towersPlaced: 0,
  mobsSpawned: 0,
  errors: 0,
  totalLatency: 0,
  latencyCount: 0,
}

async function createPlayer(index: number): Promise<TestPlayer> {
  const name = `LoadTest_Player${index}`

  // Create player via API
  const response = await fetch(`${API_URL}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId: `loadtest-${index}` }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create player ${name}: ${response.statusText}`)
  }

  const data = (await response.json()) as {
    player: { _id: string; name: string }
    isNew: boolean
  }
  const playerId = data.player._id

  // Connect socket
  const socket = io(API_URL, {
    transports: ['websocket'],
    reconnection: true,
  })

  const player: TestPlayer = {
    id: playerId,
    name,
    socket,
    gameId: null,
    actions: 0,
    errors: 0,
  }

  // Socket event handlers
  socket.on('connect', () => {
    console.log(`✅ Player ${name} connected`)
  })

  socket.on('disconnect', () => {
    console.warn(`⚠️ Player ${name} disconnected`)
  })

  socket.on('error', (error: any) => {
    console.error(`❌ Player ${name} error:`, error)
    player.errors++
    stats.errors++
  })

  socket.on('actionRejected', (data: any) => {
    console.warn(`⚠️ Player ${name} action rejected:`, data.reason)
    player.errors++
  })

  return player
}

async function createGame(player: TestPlayer): Promise<string> {
  const startTime = Date.now()

  const response = await fetch(`${API_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: player.id }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.statusText}`)
  }

  const data = (await response.json()) as { gameId: string }
  const gameId = data.gameId

  const latency = Date.now() - startTime
  stats.totalLatency += latency
  stats.latencyCount++
  stats.gamesCreated++

  console.log(`🎮 Game created by ${player.name}: ${gameId} (${latency}ms)`)
  return gameId
}

async function joinGame(player: TestPlayer, gameId: string) {
  const startTime = Date.now()

  const response = await fetch(`${API_URL}/api/games/${gameId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: player.id }),
  })

  if (!response.ok) {
    throw new Error(`Failed to join game: ${response.statusText}`)
  }

  player.gameId = gameId
  player.socket.emit('game:join', { gameId })

  const latency = Date.now() - startTime
  stats.totalLatency += latency
  stats.latencyCount++

  console.log(`👥 ${player.name} joined game ${gameId} (${latency}ms)`)
}

async function placeTower(player: TestPlayer) {
  if (!player.gameId) return

  const x = Math.floor(Math.random() * 15)
  const y = Math.floor(Math.random() * 15)

  const startTime = Date.now()

  player.socket.emit('gameAction', {
    gameId: player.gameId,
    action: {
      type: 'placeTower',
      payload: {
        playerId: player.id,
        x,
        y,
        towerType: {
          name: 'Test Tower',
          tier: 1,
          shape: [[0]],
          damage: 10,
          range: 5,
          speed: 1,
          elementalType: 'fire',
        },
      },
    },
  })

  player.actions++
  stats.towersPlaced++

  const latency = Date.now() - startTime
  stats.totalLatency += latency
  stats.latencyCount++
}

async function spawnMob(player: TestPlayer) {
  if (!player.gameId) return

  const startTime = Date.now()

  player.socket.emit('gameAction', {
    gameId: player.gameId,
    action: {
      type: 'spawnMob',
      payload: {
        fromPlayerId: player.id,
        mobType: {
          name: 'Test Mob',
          hp: 100,
          speed: 5,
          damage: 10,
          elementalType: 'normal',
        },
        targetPlayerId: player.id, // Spawn on self for testing
      },
    },
  })

  player.actions++
  stats.mobsSpawned++

  const latency = Date.now() - startTime
  stats.totalLatency += latency
  stats.latencyCount++
}

async function simulatePlayer(player: TestPlayer, gameId: string) {
  await joinGame(player, gameId)

  // Simulate player actions every 1-5 seconds
  const interval = setInterval(() => {
    const action = Math.random()
    if (action < 0.6) {
      placeTower(player).catch(err => {
        console.error(`Error placing tower for ${player.name}:`, err)
        player.errors++
      })
    } else {
      spawnMob(player).catch(err => {
        console.error(`Error spawning mob for ${player.name}:`, err)
        player.errors++
      })
    }
  }, Math.random() * 4000 + 1000) // 1-5 seconds

  return () => clearInterval(interval)
}

async function runLoadTest() {
  console.log(`🚀 Starting load test with ${NUM_PLAYERS} players for ${TEST_DURATION_MS}ms\n`)
  const startTime = Date.now()

  try {
    // Create all players
    console.log('📝 Creating players...')
    for (let i = 0; i < NUM_PLAYERS; i++) {
      const player = await createPlayer(i)
      players.push(player)
      await new Promise(resolve => setTimeout(resolve, 100)) // Stagger connections
    }

    console.log(`✅ ${NUM_PLAYERS} players created\n`)

    // Create a game
    console.log('🎮 Creating game...')
    const host = players[0]
    if (!host) {
      throw new Error('No players created!')
    }
    const gameId = await createGame(host)
    host.gameId = gameId

    console.log(`✅ Game created: ${gameId}\n`)

    // All players join and start simulating
    console.log('👥 Players joining game...')
    const cleanupFns: (() => void)[] = []

    for (let i = 1; i < NUM_PLAYERS; i++) {
      const player = players[i]
      if (!player) continue
      const cleanup = await simulatePlayer(player, gameId)
      cleanupFns.push(cleanup)
      await new Promise(resolve => setTimeout(resolve, 200)) // Stagger joins
    }

    // Also simulate host
    const hostCleanup = await simulatePlayer(host, gameId)
    cleanupFns.push(hostCleanup)

    console.log(`✅ All ${NUM_PLAYERS} players joined game\n`)
    console.log(`⏱️ Running test for ${TEST_DURATION_MS / 1000} seconds...\n`)

    // Let the test run
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS))

    // Cleanup
    console.log('\n🛑 Stopping test...')
    cleanupFns.forEach(fn => fn())

    // Disconnect all players
    players.forEach(player => {
      player.socket.disconnect()
    })

    // Wait for disconnections
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Print statistics
    const duration = (Date.now() - startTime) / 1000
    const avgLatency = stats.latencyCount > 0 ? stats.totalLatency / stats.latencyCount : 0
    const totalActions = players.reduce((sum, p) => sum + p.actions, 0)
    const totalErrors = players.reduce((sum, p) => sum + p.errors, 0)

    console.log('\n' + '='.repeat(60))
    console.log('📊 LOAD TEST RESULTS')
    console.log('='.repeat(60))
    console.log(`Duration:          ${duration.toFixed(2)}s`)
    console.log(`Players:           ${NUM_PLAYERS}`)
    console.log(`Games Created:     ${stats.gamesCreated}`)
    console.log(`Total Actions:     ${totalActions}`)
    console.log(`  - Towers Placed: ${stats.towersPlaced}`)
    console.log(`  - Mobs Spawned:  ${stats.mobsSpawned}`)
    console.log(`Total Errors:      ${totalErrors}`)
    console.log(`Avg Latency:       ${avgLatency.toFixed(2)}ms`)
    console.log(`Actions/second:    ${(totalActions / duration).toFixed(2)}`)
    console.log('='.repeat(60) + '\n')

    // Per-player stats
    console.log('👥 PER-PLAYER STATISTICS:')
    players.forEach(player => {
      console.log(
        `  ${player.name}: ${player.actions} actions, ${player.errors} errors`
      )
    })
    console.log('')

    if (totalErrors > totalActions * 0.1) {
      console.warn('⚠️ WARNING: High error rate (>10%)')
    }

    if (avgLatency > 500) {
      console.warn('⚠️ WARNING: High average latency (>500ms)')
    }

    if (totalErrors === 0 && avgLatency < 200) {
      console.log('✅ SUCCESS: All tests passed with good performance!')
    }

  } catch (error) {
    console.error('❌ Load test failed:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

// Run the load test
runLoadTest().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
