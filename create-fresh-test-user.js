// Create a fresh test user
async function createFreshUser() {
  const timestamp = Date.now()
  const email = `test${timestamp}@test.test`
  const password = 'test123!'

  console.log(`Creating fresh test user: ${email}\n`)

  const response = await fetch('http://localhost:5010/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      username: `testuser${timestamp}`,
      firstName: 'Test',
      lastName: 'User',
      app: 'ezbill'  // Required field
    })
  })

  const data = await response.json()

  if (response.ok) {
    console.log('✅ User created successfully!')
    console.log('   Email:', email)
    console.log('   Password:', password)
    console.log('   User ID:', data.user?._id)
    console.log('\n📋 Use these credentials for testing:')
    console.log(`   email: '${email}'`)
    console.log(`   password: '${password}'`)
  } else {
    console.log('❌ Failed:', response.status)
    console.log(JSON.stringify(data, null, 2))
  }
}

createFreshUser()
