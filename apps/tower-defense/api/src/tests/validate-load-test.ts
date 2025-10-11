/**
 * Quick validation test for load testing script
 * Checks if the API is reachable and basic setup works
 */

import { io } from 'socket.io-client'

const API_URL = process.env.API_URL || 'http://localhost:5030'

async function validateSetup() {
  console.log('🔍 Validating load test setup...\n')

  try {
    // 1. Check API Health
    console.log('1️⃣ Checking API health...')
    const healthResponse = await fetch(`${API_URL}/api/health`)

    if (!healthResponse.ok) {
      throw new Error(`API health check failed: ${healthResponse.statusText}`)
    }

    const healthData = await healthResponse.json()
    console.log(`   ✅ API is healthy: ${JSON.stringify(healthData)}\n`)

    // 2. Test Player Creation
    console.log('2️⃣ Testing player creation...')
    const playerResponse = await fetch(`${API_URL}/api/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'ValidationTest',
        userId: `validation-${Date.now()}`
      }),
    })

    if (!playerResponse.ok) {
      throw new Error(`Player creation failed: ${playerResponse.statusText}`)
    }

    const playerData = (await playerResponse.json()) as {
      player: { _id: string; name: string }
      isNew: boolean
    }
    console.log(`   ✅ Player created: ${playerData.player._id}\n`)

    // 3. Test Game Creation
    console.log('3️⃣ Testing game creation...')
    const gameResponse = await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: playerData.player._id }),
    })

    if (!gameResponse.ok) {
      throw new Error(`Game creation failed: ${gameResponse.statusText}`)
    }

    const gameData = (await gameResponse.json()) as { gameId: string }
    console.log(`   ✅ Game created: ${gameData.gameId}\n`)

    // 4. Test Socket.IO Connection
    console.log('4️⃣ Testing Socket.IO connection...')

    const socket = io(API_URL, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.disconnect()
        reject(new Error('Socket.IO connection timeout'))
      }, 5000)

      socket.on('connect', () => {
        clearTimeout(timeout)
        console.log(`   ✅ Socket.IO connected: ${socket.id}\n`)
        socket.disconnect()
        resolve()
      })

      socket.on('connect_error', (error) => {
        clearTimeout(timeout)
        reject(new Error(`Socket.IO connection error: ${error.message}`))
      })
    })

    // 5. Summary
    console.log('=' .repeat(60))
    console.log('✅ ALL CHECKS PASSED!')
    console.log('=' .repeat(60))
    console.log('\nLoad testing setup is valid. You can now run:')
    console.log('  pnpm test:load')
    console.log('  pnpm test:load:16')
    console.log('  pnpm test:load:stress\n')

    process.exit(0)

  } catch (error) {
    console.error('\n' + '='.repeat(60))
    console.error('❌ VALIDATION FAILED')
    console.error('='.repeat(60))

    if (error instanceof Error) {
      console.error(`\nError: ${error.message}\n`)

      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.error('💡 Solution: Make sure the API server is running:')
        console.error('   cd apps/tower-defense/api')
        console.error('   pnpm dev\n')
      }
    } else {
      console.error(error)
    }

    process.exit(1)
  }
}

validateSetup().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
