// Test login with detailed error info
async function testLogin() {
  console.log('Testing login with test@test.test\n')

  const response = await fetch('http://localhost:5010/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@test.test',
      password: 'test123!'
    })
  })

  console.log('Status:', response.status)
  console.log('Headers:', Object.fromEntries(response.headers.entries()))

  const data = await response.json()
  console.log('\nResponse:', JSON.stringify(data, null, 2))

  if (response.ok) {
    console.log('\n✅ Login successful!')
  } else {
    console.log('\n❌ Login failed')
    console.log('Trying to register instead...\n')

    const registerResponse = await fetch('http://localhost:5010/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@test.test',
        password: 'test123!',
        username: 'testuser',
        name: 'Test User',
        apps: ['ezbill']
      })
    })

    const registerData = await registerResponse.json()
    console.log('Register status:', registerResponse.status)
    console.log('Register response:', JSON.stringify(registerData, null, 2))
  }
}

testLogin()
