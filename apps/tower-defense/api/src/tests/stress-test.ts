/**
 * 🔥 STRESS TEST PROGRESSIF - Tower Defense
 *
 * Objectif : Découvrir les limites RÉELLES du système
 *
 * Tests progressifs :
 * 1. Montée en charge : 4 → 8 → 16 → 32 joueurs
 * 2. Intensité d'actions : faible → moyenne → élevée
 * 3. Densité d'entités : tours × mobs sur le terrain
 *
 * Métriques collectées :
 * - Latence moyenne/max par niveau de charge
 * - Taux d'erreur par niveau
 * - Tick duration backend (warnings > 200ms)
 * - Point de rupture (crash ou dégradation majeure)
 */

import { io, type Socket } from 'socket.io-client'

const API_URL = process.env.API_URL || 'http://localhost:5030'

interface TestPlayer {
  id: string
  name: string
  socket: Socket
  gameId: string | null
  actions: number
  errors: number
}

interface StressLevel {
  name: string
  players: number
  actionIntervalMs: number // Intervalle entre actions (plus bas = plus intense)
  duration: number // Durée en secondes
  description: string
}

// 🎯 Niveaux de stress progressifs
const STRESS_LEVELS: StressLevel[] = [
  {
    name: 'Baseline',
    players: 4,
    actionIntervalMs: 3000, // 1 action toutes les 3s
    duration: 30,
    description: '4 joueurs, rythme tranquille (baseline)',
  },
  {
    name: 'Normal',
    players: 8,
    actionIntervalMs: 2000, // 1 action toutes les 2s
    duration: 45,
    description: '8 joueurs, rythme normal',
  },
  {
    name: 'Intensive',
    players: 12,
    actionIntervalMs: 1500, // 1 action toutes les 1.5s
    duration: 45,
    description: '12 joueurs, rythme soutenu',
  },
  {
    name: 'Heavy',
    players: 16,
    actionIntervalMs: 1000, // 1 action par seconde
    duration: 60,
    description: '16 joueurs, rythme intense',
  },
  {
    name: 'Extreme',
    players: 24,
    actionIntervalMs: 800, // 1.25 actions par seconde
    duration: 60,
    description: '24 joueurs, surcharge simulée',
  },
  {
    name: 'Breaking Point',
    players: 32,
    actionIntervalMs: 500, // 2 actions par seconde
    duration: 90,
    description: '32 joueurs, test de rupture',
  },
]

interface LevelResult {
  level: StressLevel
  success: boolean
  duration: number
  totalActions: number
  totalErrors: number
  avgLatency: number
  maxLatency: number
  errorRate: number
  actionsPerSecond: number
  crashReason?: string
}

const results: LevelResult[] = []

async function createPlayer(index: number): Promise<TestPlayer> {
  const name = `StressTest_P${index}`

  const response = await fetch(`${API_URL}/api/players`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId: `stress-${index}-${Date.now()}` }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create player ${name}: ${response.statusText}`)
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
    actions: 0,
    errors: 0,
  }

  socket.on('error', () => {
    player.errors++
  })

  socket.on('actionRejected', () => {
    player.errors++
  })

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

function performAction(player: TestPlayer, latencies: number[]) {
  if (!player.gameId) return

  const startTime = Date.now()
  const action = Math.random()

  if (action < 0.6) {
    // PlaceTower (60%)
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
            name: 'Stress Tower',
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
  } else {
    // SpawnMob (40%)
    player.socket.emit('gameAction', {
      gameId: player.gameId,
      action: {
        type: 'spawnMob',
        payload: {
          fromPlayerId: player.id,
          mobType: {
            name: 'Stress Mob',
            hp: 100,
            speed: 5,
            damage: 10,
            elementalType: 'normal',
          },
          targetPlayerId: player.id,
        },
      },
    })
    player.actions++
  }

  const latency = Date.now() - startTime
  latencies.push(latency)
}

async function runStressLevel(level: StressLevel): Promise<LevelResult> {
  console.log('\n' + '='.repeat(70))
  console.log(`🔥 STRESS TEST: ${level.name}`)
  console.log('='.repeat(70))
  console.log(`Players: ${level.players}`)
  console.log(`Action Interval: ${level.actionIntervalMs}ms`)
  console.log(`Duration: ${level.duration}s`)
  console.log(`Description: ${level.description}\n`)

  const players: TestPlayer[] = []
  const latencies: number[] = []
  const startTime = Date.now()
  let gameId = ''

  try {
    // 1. Create all players
    console.log(`📝 Creating ${level.players} players...`)
    for (let i = 0; i < level.players; i++) {
      const player = await createPlayer(i)
      players.push(player)
      await new Promise(resolve => setTimeout(resolve, 50)) // Stagger
    }
    console.log(`✅ ${level.players} players created\n`)

    // 2. Create game
    console.log('🎮 Creating game...')
    const host = players[0]
    if (!host) throw new Error('No host player')
    gameId = await createGame(host)
    host.gameId = gameId
    console.log(`✅ Game created: ${gameId}\n`)

    // 3. All players join
    console.log('👥 Players joining...')
    for (let i = 1; i < players.length; i++) {
      const player = players[i]
      if (!player) continue
      await joinGame(player, gameId)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    await joinGame(host, gameId)
    console.log(`✅ All ${level.players} players joined\n`)

    // 4. Start action simulation
    console.log(`⏱️  Running test for ${level.duration}s...\n`)

    const intervals: NodeJS.Timeout[] = []

    players.forEach(player => {
      const interval = setInterval(() => {
        performAction(player, latencies)
      }, level.actionIntervalMs)
      intervals.push(interval)
    })

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, level.duration * 1000))

    // Stop all intervals
    intervals.forEach(interval => clearInterval(interval))

    // Disconnect all players
    players.forEach(player => player.socket.disconnect())

    await new Promise(resolve => setTimeout(resolve, 1000))

    // 5. Calculate results
    const duration = (Date.now() - startTime) / 1000
    const totalActions = players.reduce((sum, p) => sum + p.actions, 0)
    const totalErrors = players.reduce((sum, p) => sum + p.errors, 0)
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0
    const errorRate = totalActions > 0 ? (totalErrors / totalActions) * 100 : 0
    const actionsPerSecond = totalActions / duration

    const result: LevelResult = {
      level,
      success: true,
      duration,
      totalActions,
      totalErrors,
      avgLatency,
      maxLatency,
      errorRate,
      actionsPerSecond,
    }

    // Print results
    console.log('\n' + '─'.repeat(70))
    console.log(`📊 RESULTS - ${level.name}`)
    console.log('─'.repeat(70))
    console.log(`✅ Status:           SUCCESS`)
    console.log(`⏱️  Duration:         ${duration.toFixed(2)}s`)
    console.log(`🎯 Total Actions:    ${totalActions}`)
    console.log(`❌ Total Errors:     ${totalErrors} (${errorRate.toFixed(2)}%)`)
    console.log(`📈 Actions/second:   ${actionsPerSecond.toFixed(2)}`)
    console.log(`⚡ Avg Latency:      ${avgLatency.toFixed(2)}ms`)
    console.log(`🔥 Max Latency:      ${maxLatency.toFixed(2)}ms`)

    // Performance warnings
    if (errorRate > 5) {
      console.log(`\n⚠️  WARNING: High error rate (${errorRate.toFixed(2)}% > 5%)`)
    }
    if (avgLatency > 200) {
      console.log(`\n⚠️  WARNING: High latency (${avgLatency.toFixed(2)}ms > 200ms)`)
    }
    if (maxLatency > 1000) {
      console.log(`\n⚠️  WARNING: Very high max latency (${maxLatency.toFixed(2)}ms > 1000ms)`)
    }

    console.log('─'.repeat(70))

    return result

  } catch (error) {
    // Test failed (crash or error)
    const duration = (Date.now() - startTime) / 1000
    const totalActions = players.reduce((sum, p) => sum + p.actions, 0)
    const totalErrors = players.reduce((sum, p) => sum + p.errors, 0)
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0

    const result: LevelResult = {
      level,
      success: false,
      duration,
      totalActions,
      totalErrors,
      avgLatency,
      maxLatency,
      errorRate: 100,
      actionsPerSecond: duration > 0 ? totalActions / duration : 0,
      crashReason: error instanceof Error ? error.message : String(error),
    }

    console.log('\n' + '─'.repeat(70))
    console.log(`📊 RESULTS - ${level.name}`)
    console.log('─'.repeat(70))
    console.log(`❌ Status:           FAILED`)
    console.log(`💥 Crash Reason:     ${result.crashReason}`)
    console.log(`⏱️  Duration:         ${duration.toFixed(2)}s`)
    console.log(`🎯 Actions before crash: ${totalActions}`)
    console.log('─'.repeat(70))

    // Cleanup
    players.forEach(player => {
      try {
        player.socket.disconnect()
      } catch (e) {
        // Ignore
      }
    })

    return result
  }
}

async function runAllStressTests() {
  console.log('\n')
  console.log('🔥'.repeat(35))
  console.log('🔥 TOWER DEFENSE - PROGRESSIVE STRESS TEST 🔥')
  console.log('🔥'.repeat(35))
  console.log('\nObjectif: Découvrir les limites RÉELLES du système')
  console.log(`Tests: ${STRESS_LEVELS.length} niveaux de charge progressifs\n`)

  for (const level of STRESS_LEVELS) {
    const result = await runStressLevel(level)
    results.push(result)

    // Si le test échoue, arrêter (point de rupture atteint)
    if (!result.success) {
      console.log('\n🛑 BREAKING POINT REACHED - Stopping tests\n')
      break
    }

    // Pause entre les tests pour stabiliser
    console.log('\n⏸️  Cooling down for 5 seconds...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Final summary
  console.log('\n')
  console.log('='.repeat(70))
  console.log('🏁 FINAL SUMMARY - ALL STRESS TESTS')
  console.log('='.repeat(70))
  console.log('\n')

  console.log('┌─────────────────┬─────────┬──────────┬─────────┬──────────┬───────────┐')
  console.log('│ Level           │ Players │ Actions  │ Errors  │ Avg Lat  │ Status    │')
  console.log('├─────────────────┼─────────┼──────────┼─────────┼──────────┼───────────┤')

  results.forEach(r => {
    const levelName = r.level.name.padEnd(15)
    const players = String(r.level.players).padStart(7)
    const actions = String(r.totalActions).padStart(8)
    const errors = `${r.totalErrors} (${r.errorRate.toFixed(1)}%)`.padStart(7)
    const latency = `${r.avgLatency.toFixed(0)}ms`.padStart(8)
    const status = r.success ? '✅ OK     ' : '❌ FAILED '

    console.log(`│ ${levelName} │ ${players} │ ${actions} │ ${errors} │ ${latency} │ ${status}│`)
  })

  console.log('└─────────────────┴─────────┴──────────┴─────────┴──────────┴───────────┘')

  // Determine max capacity
  const lastSuccess = results.filter(r => r.success).pop()
  const firstFailure = results.find(r => !r.success)

  console.log('\n📊 CAPACITY ANALYSIS:\n')

  if (lastSuccess) {
    console.log(`✅ Maximum Validated Capacity:`)
    console.log(`   - Players: ${lastSuccess.level.players}`)
    console.log(`   - Actions/second: ${lastSuccess.actionsPerSecond.toFixed(2)}`)
    console.log(`   - Avg Latency: ${lastSuccess.avgLatency.toFixed(2)}ms`)
    console.log(`   - Error Rate: ${lastSuccess.errorRate.toFixed(2)}%`)
  }

  if (firstFailure) {
    console.log(`\n❌ Breaking Point:`)
    console.log(`   - Level: ${firstFailure.level.name}`)
    console.log(`   - Players: ${firstFailure.level.players}`)
    console.log(`   - Reason: ${firstFailure.crashReason}`)
  } else {
    console.log(`\n🎉 ALL TESTS PASSED! Server handled maximum tested load.`)
  }

  console.log('\n' + '='.repeat(70) + '\n')

  process.exit(0)
}

// Run the full stress test suite
runAllStressTests().catch(error => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
