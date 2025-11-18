// Create test user in EZAuth
async function createTestUser() {
  console.log('Creating test user: test@test.test\n')

  try {
    // Try to register the user
    const response = await fetch('http://localhost:5010/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.test',
        password: 'test123!',
        name: 'Test User'
      })
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ User created successfully!')
      console.log('   Email:', data.user?.email)
      console.log('   Name:', data.user?.name)
      console.log('   ID:', data.user?._id)
      console.log('\n🎉 You can now login with:')
      console.log('   Email: test@test.test')
      console.log('   Password: test123!')
    } else if (response.status === 409) {
      console.log('⚠️  User already exists - trying to login instead...\n')

      // Try to login
      const loginResponse = await fetch('http://localhost:5010/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.test',
          password: 'test123!'
        })
      })

      const loginData = await loginResponse.json()

      if (loginResponse.ok) {
        console.log('✅ Login successful!')
        console.log('   Email:', loginData.user?.email)
        console.log('   Name:', loginData.user?.name)
        console.log('   ID:', loginData.user?._id)
      } else {
        console.log('❌ Login failed:', loginData.error || loginData.message)
      }
    } else {
      console.log('❌ Failed to create user:', response.status)
      console.log('Error:', data.error || data.message)
      console.log('Details:', JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message)
  }
}

createTestUser()
