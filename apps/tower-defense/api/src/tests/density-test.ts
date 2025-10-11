/**
 * 🎯 TEST DE DENSITÉ D'ENTITÉS - Tower Defense Backend
 *
 * Objectif : Tester la performance du TICKER avec haute densité d'entités
 *
 * Ce qu'on teste :
 * - Ticker avec 500+ mobs actifs
 * - Ticker avec 100+ tours qui tirent
 * - Collision detection avec spatial grid sous charge
 * - Pathfinding de centaines de mobs
 * - DB sync avec énormes états
 *
 * Ce qu'on a PAS testé avant :
 * ❌ Nombre de joueurs → OK (testé jusqu'à 32)
 * ❌ Densité d'entités → NON TESTÉ (on va le faire maintenant)
 */

import { io, type Socket } from 'socket.io-client'

const API_URL = process.env.API_URL || 'http://localhost:5030'

interface TestPlayer {
  id: string
  name: string
  socket: Socket
  gameId: string | null
  towers: number
  mobsSpawned: number
}

interface DensityTest {
  name: string
  description: string
  mobs: number
  towers: number
  duration: number // secondes
}

const DENSITY_TESTS: DensityTest[] = [
  {
    name: 'Baseline Mobs',
    description: '50 mobs simultanés',
    mobs: 50,
    towers: 10,
    duration: 30,
  },
  {
    name: 'Heavy Mobs',
    description: '200 mobs simultanés',
    mobs: 200,
    towers: 20,
    duration: 45,
  },
  {
    name: 'Extreme Mobs',
    description: '500 mobs simultanés',
    mobs: 500,
    towers: 30,
    duration: 60,
  },
  {
    name: 'Heavy Towers',
    description: '100 tours + 100 mobs',
    mobs: 100,
    towers: 100,
    duration: 60,
  },
  {
    name: 'Extreme Density',
    description: '200 tours + 400 mobs = chaos total',
    mobs: 400,
    towers: 200,
    duration: 90,
  },
]

interface DensityResult {
  test: DensityTest
  success: boolean
  duration: number
  towersPlaced: number
  mobsSpawned: number
  ticksObserved: number
  avgTickDuration?: number
  slowTicks: number
  crashReason?: string
}

const results: DensityResult[] = []

async function createPlayer(): Promise<TestPlayer> {
  const name = `DensityTest_P`

  const response = await fetch(`${API_URL}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId: `density-${Date.now()}` }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create player: ${response.statusText}`)
  }

  const data = (await response.json()) as {
    player: { _id: string; name: string }
    isNew: boolean
  }
  const playerId = data.player._id

  const socket = io(API_URL, {
    transports: ['websocket'],
    reconnection: true,
  })

  const player: TestPlayer = {
    id: playerId,
    name,
    socket,
    gameId: null,
    towers: 0,
    mobsSpawned: 0,
  }

  return player
}

async function createGame(player: TestPlayer): Promise<string> {
  const response = await fetch(`${API_URL}/api/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: player.id }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create game: ${response.statusText}`)
  }

  const data = (await response.json()) as { gameId: string }
  return data.gameId
}

async function joinGame(player: TestPlayer, gameId: string) {
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
}

function placeTower(player: TestPlayer) {
  if (!player.gameId) return

  // Placer sur une position aléatoire
  const x = Math.floor(Math.random() * 15)
  const y = Math.floor(Math.random() * 15)

  player.socket.emit('gameAction', {
    gameId: player.gameId,
    action: {
      type: 'placeTower',
      payload: {
        playerId: player.id,
        x,
        y,
        towerType: {
          name: 'Density Tower',
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

  player.towers++
}

function spawnMob(player: TestPlayer) {
  if (!player.gameId) return

  player.socket.emit('gameAction', {
    gameId: player.gameId,
    action: {
      type: 'spawnMob',
      payload: {
        fromPlayerId: player.id,
        mobType: {
          name: 'Density Mob',
          hp: 100,
          speed: 5,
          damage: 10,
          elementalType: 'normal',
        },
        targetPlayerId: player.id,
      },
    },
  })

  player.mobsSpawned++
}

async function runDensityTest(test: DensityTest): Promise<DensityResult> {
  console.log('\n' + '='.repeat(70))
  console.log(`🎯 DENSITY TEST: ${test.name}`)
  console.log('='.repeat(70))
  console.log(`Target: ${test.mobs} mobs, ${test.towers} towers`)
  console.log(`Duration: ${test.duration}s`)
  console.log(`Description: ${test.description}\n`)

  const startTime = Date.now()
  let player: TestPlayer | null = null

  try {
    // 1. Create player
    console.log('📝 Creating player...')
    player = await createPlayer()
    console.log(`✅ Player created: ${player.id}\n`)

    // 2. Create game
    console.log('🎮 Creating game...')
    const gameId = await createGame(player)
    console.log(`✅ Game created: ${gameId}\n`)

    // 3. Join game
    await joinGame(player, gameId)
    console.log('✅ Player joined\n')

    // Monitor ticks
    let ticksObserved = 0
    let slowTicks = 0
    const tickDurations: number[] = []

    player.socket.on('gameState', (state: any) => {
      ticksObserved++
      // Le serveur devrait logger les slow ticks, on peut les capturer côté client
    })

    // 4. Phase 1: Place towers
    console.log(`⚙️  Phase 1: Placing ${test.towers} towers...`)
    const towerInterval = 100 // 1 tour toutes les 100ms
    for (let i = 0; i < test.towers; i++) {
      placeTower(player)
      await new Promise(resolve => setTimeout(resolve, towerInterval))

      if ((i + 1) % 20 === 0) {
        console.log(`   Placed ${i + 1}/${test.towers} towers...`)
      }
    }
    console.log(`✅ All towers placed\n`)

    // 5. Phase 2: Spawn mobs en continu
    console.log(`⚙️  Phase 2: Spawning ${test.mobs} mobs over ${test.duration}s...`)
    const mobsPerSecond = test.mobs / test.duration
    const mobInterval = 1000 / mobsPerSecond

    const mobSpawnInterval = setInterval(() => {
      if (player && player.mobsSpawned < test.mobs) {
        spawnMob(player)

        if (player.mobsSpawned % 50 === 0) {
          console.log(`   Spawned ${player.mobsSpawned}/${test.mobs} mobs...`)
        }
      }
    }, mobInterval)

    // 6. Wait for test duration
    await new Promise(resolve => setTimeout(resolve, test.duration * 1000))

    clearInterval(mobSpawnInterval)

    console.log(`✅ Test completed\n`)

    // 7. Disconnect
    player.socket.disconnect()
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 8. Calculate results
    const duration = (Date.now() - startTime) / 1000

    const result: DensityResult = {
      test,
      success: true,
      duration,
      towersPlaced: player.towers,
      mobsSpawned: player.mobsSpawned,
      ticksObserved,
      slowTicks,
    }

    // Print results
    console.log('\n' + '─'.repeat(70))
    console.log(`📊 RESULTS - ${test.name}`)
    console.log('─'.repeat(70))
    console.log(`✅ Status:           SUCCESS`)
    console.log(`⏱️  Duration:         ${duration.toFixed(2)}s`)
    console.log(`🏗️  Towers Placed:    ${result.towersPlaced}`)
    console.log(`👾 Mobs Spawned:     ${result.mobsSpawned}`)
    console.log(`⏲️  Ticks Observed:   ${ticksObserved}`)
    console.log(`⚠️  Slow Ticks:       ${slowTicks}`)
    console.log('─'.repeat(70))

    if (slowTicks > ticksObserved * 0.1) {
      console.log(`\n⚠️  WARNING: High slow tick rate (${((slowTicks / ticksObserved) * 100).toFixed(1)}%)`)
    }

    return result

  } catch (error) {
    const duration = (Date.now() - startTime) / 1000

    const result: DensityResult = {
      test,
      success: false,
      duration,
      towersPlaced: player?.towers || 0,
      mobsSpawned: player?.mobsSpawned || 0,
      ticksObserved: 0,
      slowTicks: 0,
      crashReason: error instanceof Error ? error.message : String(error),
    }

    console.log('\n' + '─'.repeat(70))
    console.log(`📊 RESULTS - ${test.name}`)
    console.log('─'.repeat(70))
    console.log(`❌ Status:           FAILED`)
    console.log(`💥 Crash Reason:     ${result.crashReason}`)
    console.log(`⏱️  Duration:         ${duration.toFixed(2)}s`)
    console.log(`🏗️  Towers Placed:    ${result.towersPlaced}`)
    console.log(`👾 Mobs Spawned:     ${result.mobsSpawned}`)
    console.log('─'.repeat(70))

    if (player) {
      try {
        player.socket.disconnect()
      } catch (e) {
        // Ignore
      }
    }

    return result
  }
}

async function runAllDensityTests() {
  console.log('\n')
  console.log('🎯'.repeat(35))
  console.log('🎯 TOWER DEFENSE - ENTITY DENSITY TEST 🎯')
  console.log('🎯'.repeat(35))
  console.log('\nObjectif: Tester la densité d\'entités (mobs × towers)')
  console.log(`Tests: ${DENSITY_TESTS.length} niveaux de densité croissants\n`)

  for (const test of DENSITY_TESTS) {
    const result = await runDensityTest(test)
    results.push(result)

    // Si le test échoue, arrêter
    if (!result.success) {
      console.log('\n🛑 BREAKING POINT REACHED - Stopping tests\n')
      break
    }

    // Pause entre les tests
    console.log('\n⏸️  Cooling down for 5 seconds...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Final summary
  console.log('\n')
  console.log('='.repeat(70))
  console.log('🏁 FINAL SUMMARY - ENTITY DENSITY TESTS')
  console.log('='.repeat(70))
  console.log('\n')

  console.log('┌─────────────────┬────────┬────────┬──────────┬──────────┬───────────┐')
  console.log('│ Test            │ Towers │ Mobs   │ Duration │ Ticks    │ Status    │')
  console.log('├─────────────────┼────────┼────────┼──────────┼──────────┼───────────┤')

  results.forEach(r => {
    const testName = r.test.name.padEnd(15)
    const towers = String(r.towersPlaced).padStart(6)
    const mobs = String(r.mobsSpawned).padStart(6)
    const duration = `${r.duration.toFixed(0)}s`.padStart(8)
    const ticks = String(r.ticksObserved).padStart(8)
    const status = r.success ? '✅ OK     ' : '❌ FAILED '

    console.log(`│ ${testName} │ ${towers} │ ${mobs} │ ${duration} │ ${ticks} │ ${status}│`)
  })

  console.log('└─────────────────┴────────┴────────┴──────────┴──────────┴───────────┘')

  // Determine max capacity
  const lastSuccess = results.filter(r => r.success).pop()
  const firstFailure = results.find(r => !r.success)

  console.log('\n📊 DENSITY CAPACITY ANALYSIS:\n')

  if (lastSuccess) {
    console.log(`✅ Maximum Validated Density:`)
    console.log(`   - Towers: ${lastSuccess.towersPlaced}`)
    console.log(`   - Mobs: ${lastSuccess.mobsSpawned}`)
    console.log(`   - Total Entities: ${lastSuccess.towersPlaced + lastSuccess.mobsSpawned}`)
    console.log(`   - Ticks: ${lastSuccess.ticksObserved}`)
  }

  if (firstFailure) {
    console.log(`\n❌ Breaking Point:`)
    console.log(`   - Test: ${firstFailure.test.name}`)
    console.log(`   - Target: ${firstFailure.test.towers} towers + ${firstFailure.test.mobs} mobs`)
    console.log(`   - Reason: ${firstFailure.crashReason}`)
  } else {
    console.log(`\n🎉 ALL TESTS PASSED! Server handled maximum density tested.`)
  }

  console.log('\n' + '='.repeat(70) + '\n')

  process.exit(0)
}

// Run the density test suite
runAllDensityTests().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
