/**
 * Script de test du flux Beta Access complet
 * Usage: node test-beta-access.js
 */

const API_URL = 'http://localhost:5010'

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.cyan}🔹 ${msg}${colors.reset}`),
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error) {
    throw new Error(`${endpoint}: ${error.message}`)
  }
}

async function testBetaAccessFlow() {
  console.log('\n🚀 Testing Beta Access Flow\n')
  console.log('='.repeat(60))

  let adminToken = null
  let accessCode = null
  const testEmail = `beta-test-${Date.now()}@example.com`
  const testUsername = `betatest${Date.now()}`

  try {
    // ========== STEP 1: Login as superadmin ==========
    log.step('Step 1: Login as superadmin')
    const loginResponse = await request('/api/auth/login/token', {
      method: 'POST',
      body: JSON.stringify({
        email: 'yannick.kiki@gmail.com',
        password: 'TestTest123!',
        app: 'ezstart'
      })
    })

    adminToken = loginResponse.access_token
    log.success(`Logged in as: ${loginResponse.user.email}`)
    log.info(`   Roles: ${loginResponse.user.roles?.join(', ') || 'none'}`)

    // ========== STEP 2: Add email to waitlist ==========
    log.step('Step 2: Add test email to waitlist')
    await request('/api/waitlist/green-pulse/add', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail })
    })
    log.success(`Added ${testEmail} to green-pulse waitlist`)

    // ========== STEP 3: List waitlist (Admin) ==========
    log.step('Step 3: List waitlist entries')
    const waitlistResponse = await request('/api/admin/green-pulse', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    log.success(`Waitlist for green-pulse:`)
    log.info(`   Total: ${waitlistResponse.stats.total}`)
    log.info(`   Pending: ${waitlistResponse.stats.pending}`)
    log.info(`   Invited: ${waitlistResponse.stats.invited}`)
    log.info(`   Activated: ${waitlistResponse.stats.activated}`)

    // ========== STEP 4: Invite email (generate access code) ==========
    log.step('Step 4: Invite email from waitlist')
    const inviteResponse = await request(`/api/admin/green-pulse/${encodeURIComponent(testEmail)}/invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ notes: 'Test beta tester' })
    })

    accessCode = inviteResponse.accessCode
    log.success(`Generated access code: ${accessCode}`)
    log.info(`   For: ${inviteResponse.email}`)

    // ========== STEP 5: Signup with access code ==========
    log.step('Step 5: Signup new user with access code')
    const signupResponse = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        password: 'BetaTest123!',
        app: 'green-pulse',
        accessCode: accessCode
      })
    })
    log.success(`User registered successfully!`)
    log.info(`   Code: ${signupResponse.code}`)

    // ========== STEP 6: Exchange code for token ==========
    log.step('Step 6: Exchange auth code for token')
    const tokenResponse = await request('/api/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        code: signupResponse.code,
        app: 'green-pulse'
      })
    })

    log.success(`Token received!`)
    log.info(`   User ID: ${tokenResponse.user._id}`)
    log.info(`   Email: ${tokenResponse.user.email}`)
    log.info(`   Username: ${tokenResponse.user.username}`)
    log.info(`   Roles: ${tokenResponse.user.roles?.join(', ') || 'none'}`)
    log.info(`   Permissions: ${tokenResponse.user.permissions?.join(', ') || 'none'}`)
    log.info(`   Features: ${tokenResponse.user.features?.join(', ') || 'none'}`)

    // ========== STEP 7: Verify waitlist updated ==========
    log.step('Step 7: Verify waitlist entry updated to "activated"')
    const updatedWaitlistResponse = await request('/api/admin/green-pulse', {
      headers: { Authorization: `Bearer ${adminToken}` }
    })

    const entry = updatedWaitlistResponse.entries.find(e => e.email === testEmail)
    if (entry && entry.status === 'activated') {
      log.success(`Waitlist entry status: ${entry.status} ✓`)
      log.info(`   Activated at: ${entry.activatedAt}`)
    } else {
      log.error(`Waitlist entry not updated correctly`)
    }

    // ========== SUCCESS ==========
    console.log('\n' + '='.repeat(60))
    log.success('🎉 ALL TESTS PASSED!')
    console.log('='.repeat(60) + '\n')

    return {
      success: true,
      testEmail,
      accessCode,
      user: tokenResponse.user
    }

  } catch (error) {
    log.error(`Test failed: ${error.message}`)
    console.log('\n' + '='.repeat(60))
    log.error('❌ TEST FAILED')
    console.log('='.repeat(60) + '\n')
    throw error
  }
}

// Run tests
testBetaAccessFlow()
  .then((result) => {
    console.log('\n📊 Test Results:')
    console.log(JSON.stringify(result, null, 2))
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
