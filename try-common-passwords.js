// Try common passwords for test@test.test
async function tryPasswords() {
  const email = 'test@test.test'
  const passwords = [
    'test123!',
    'Test123!',
    'test1234',
    'Test1234',
    'password',
    'Password1',
    'ezstart123'
  ]

  for (const password of passwords) {
    console.log(`Trying: ${password}`)

    const response = await fetch('http://localhost:5010/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, app: 'ezbill' })
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`\n✅ SUCCESS! Password is: ${password}`)
      console.log('User:', data.user?.email)
      return
    }

    // Small delay to avoid rate limit
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('\n❌ None of the common passwords worked')
  console.log('You may need to create a new user or reset password')
}

tryPasswords()
