/**
 * Script to create a test user via EZAuth API
 */

const EZAUTH_API = 'http://localhost:6110/api/auth'
const EZBILL_API = 'http://localhost:6120/api'

interface AuthCodeResponse {
  success: boolean
  code: string
  expires_at: string
  message: string
}

interface TokenResponse {
  success: boolean
  access_token: string
  token_type: string
  expires_in: number
}

async function createTestUser() {
  console.log('🧪 Creating Test User for EZBill Soft Delete Testing\n')

  try {
    // 1. Register test user via EZAuth
    console.log('1️⃣ Registering test user...')
    const registerResponse = await fetch(`${EZAUTH_API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@ezbill.local',
        password: 'TestPassword123!',
        username: 'testuser',
        app: 'ezbill',
      }),
    })

    if (!registerResponse.ok) {
      const error = await registerResponse.json()
      if (error.error?.includes('already exists')) {
        console.log('ℹ️ User already exists, attempting login...\n')
        return await loginTestUser()
      }
      throw new Error(`Registration failed: ${JSON.stringify(error)}`)
    }

    const registerData: AuthCodeResponse = await registerResponse.json()
    console.log('✅ User registered successfully')
    console.log(`   Code: ${registerData.code}\n`)

    // 2. Exchange code for token
    console.log('2️⃣ Exchanging code for token...')
    const tokenResponse = await fetch(`${EZAUTH_API}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: registerData.code,
        app: 'ezbill',
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json()
      throw new Error(`Token exchange failed: ${JSON.stringify(error)}`)
    }

    const tokenData: TokenResponse = await tokenResponse.json()
    console.log('✅ Token received')
    console.log(`   Token: ${tokenData.access_token.substring(0, 20)}...\n`)

    // 3. Verify token and get user info
    console.log('3️⃣ Getting user info...')
    const meResponse = await fetch(`${EZAUTH_API}/me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!meResponse.ok) {
      const error = await meResponse.json()
      throw new Error(`Failed to get user info: ${JSON.stringify(error)}`)
    }

    const meData = await meResponse.json()
    console.log('✅ User info retrieved')
    console.log(`   User ID: ${meData.user._id}`)
    console.log(`   Email: ${meData.user.email}`)
    console.log(`   Username: ${meData.user.username}\n`)

    // Save credentials for testing
    console.log('📝 Test User Credentials:')
    console.log(`   Email: test@ezbill.local`)
    console.log(`   Password: TestPassword123!`)
    console.log(`   User ID: ${meData.user._id}`)
    console.log(`   Token: ${tokenData.access_token}\n`)

    return {
      userId: meData.user._id,
      token: tokenData.access_token,
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

async function loginTestUser() {
  console.log('1️⃣ Logging in existing test user...')
  const loginResponse = await fetch(`${EZAUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@ezbill.local',
      password: 'TestPassword123!',
      app: 'ezbill',
    }),
  })

  if (!loginResponse.ok) {
    const error = await loginResponse.json()
    throw new Error(`Login failed: ${JSON.stringify(error)}`)
  }

  const loginData: AuthCodeResponse = await loginResponse.json()
  console.log('✅ Login successful')
  console.log(`   Code: ${loginData.code}\n`)

  // Exchange code for token
  console.log('2️⃣ Exchanging code for token...')
  const tokenResponse = await fetch(`${EZAUTH_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: loginData.code,
      app: 'ezbill',
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.json()
    throw new Error(`Token exchange failed: ${JSON.stringify(error)}`)
  }

  const tokenData: TokenResponse = await tokenResponse.json()
  console.log('✅ Token received\n')

  // Get user info
  console.log('3️⃣ Getting user info...')
  const meResponse = await fetch(`${EZAUTH_API}/me`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  })

  if (!meResponse.ok) {
    const error = await meResponse.json()
    throw new Error(`Failed to get user info: ${JSON.stringify(error)}`)
  }

  const meData = await meResponse.json()
  console.log('✅ User info retrieved')
  console.log(`   User ID: ${meData.user._id}`)
  console.log(`   Email: ${meData.user.email}\n`)

  return {
    userId: meData.user._id,
    token: tokenData.access_token,
  }
}

async function testPaymentMethodsSoftDelete(userId: string) {
  console.log('🧪 Testing Payment Methods Soft Delete\n')

  try {
    // 1. Create test payment method
    console.log('1️⃣ Creating test payment method...')
    const createResponse = await fetch(`${EZBILL_API}/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        name: 'Test Bank Account',
        type: 'bank_transfer',
        accountNumber: '123456789',
        bankName: 'Test Bank',
        isDefault: false,
      }),
    })

    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(`Create failed: ${JSON.stringify(error)}`)
    }

    const paymentMethod = await createResponse.json()
    console.log('✅ Payment method created')
    console.log(`   ID: ${paymentMethod._id}`)
    console.log(`   Name: ${paymentMethod.name}\n`)

    // 2. Verify it appears in active list
    console.log('2️⃣ Checking active payment methods...')
    const activeResponse = await fetch(`${EZBILL_API}/payment-methods`, {
      headers: { 'x-user-id': userId },
    })

    const activeMethods = await activeResponse.json()
    const foundActive = activeMethods.find((pm: any) => pm._id === paymentMethod._id)
    console.log(`✅ Found in active list: ${foundActive ? 'YES' : 'NO'}`)
    console.log(`   Total active: ${activeMethods.length}\n`)

    // 3. Soft delete
    console.log('3️⃣ Soft deleting payment method...')
    const deleteResponse = await fetch(`${EZBILL_API}/payment-methods/${paymentMethod._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json()
      throw new Error(`Delete failed: ${JSON.stringify(error)}`)
    }

    const deletedMethod = await deleteResponse.json()
    console.log('✅ Payment method soft deleted')
    console.log(`   deletedAt: ${deletedMethod.deletedAt}\n`)

    // 4. Verify not in active list anymore
    console.log('4️⃣ Checking active list again...')
    const activeResponse2 = await fetch(`${EZBILL_API}/payment-methods`, {
      headers: { 'x-user-id': userId },
    })

    const activeMethods2 = await activeResponse2.json()
    const stillActive = activeMethods2.find((pm: any) => pm._id === paymentMethod._id)
    console.log(`✅ Still in active list: ${stillActive ? 'YES (BUG!)' : 'NO (correct)'}`)
    console.log(`   Total active: ${activeMethods2.length}\n`)

    // 5. Verify appears in deleted list
    console.log('5️⃣ Checking deleted payment methods...')
    const deletedResponse = await fetch(`${EZBILL_API}/payment-methods?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedMethods = await deletedResponse.json()
    const foundDeleted = deletedMethods.find((pm: any) => pm._id === paymentMethod._id)
    console.log(`✅ Found in deleted list: ${foundDeleted ? 'YES (correct)' : 'NO (BUG!)'}`)
    console.log(`   Total deleted: ${deletedMethods.length}`)

    if (foundDeleted) {
      console.log(`   deletedAt: ${foundDeleted.deletedAt}`)
    }
    console.log()

    // 6. Cleanup - hard delete
    console.log('6️⃣ Cleanup - hard deleting...')
    const hardDeleteResponse = await fetch(
      `${EZBILL_API}/payment-methods/${paymentMethod._id}?permanent=true`,
      {
        method: 'DELETE',
        headers: { 'x-user-id': userId },
      }
    )

    if (!hardDeleteResponse.ok) {
      const error = await hardDeleteResponse.json()
      throw new Error(`Hard delete failed: ${JSON.stringify(error)}`)
    }

    console.log('✅ Payment method permanently deleted\n')

    // Summary
    console.log('📊 Test Summary:')
    console.log(`   ✅ Create: ${foundActive ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Soft Delete: ${!stillActive ? 'PASS' : 'FAIL'}`)
    console.log(`   ✅ Appears in deleted list: ${foundDeleted ? 'PASS' : 'FAIL'}`)
    console.log()

    if (!stillActive && foundDeleted) {
      console.log('🎉 All tests PASSED!')
    } else {
      console.log('❌ Some tests FAILED - check logs above')
    }
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Main execution
;(async () => {
  try {
    const { userId } = await createTestUser()
    console.log('─'.repeat(60))
    console.log()
    await testPaymentMethodsSoftDelete(userId)
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
})()
