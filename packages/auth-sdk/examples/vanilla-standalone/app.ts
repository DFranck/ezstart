import { createCoreAuthClient, AuthError } from '@ezstart/auth-sdk/core'

const client = createCoreAuthClient({
  apiUrl: import.meta.env.VITE_AUTH_API_URL ?? 'https://api.example.com',
  appName: 'myapp',
})

const signedOut = document.getElementById('signed-out') as HTMLElement
const signedIn = document.getElementById('signed-in') as HTMLElement
const username = document.getElementById('username') as HTMLElement
const userJson = document.getElementById('user-json') as HTMLElement
const form = document.getElementById('login-form') as HTMLFormElement
const submit = document.getElementById('submit') as HTMLButtonElement
const logoutButton = document.getElementById('logout') as HTMLButtonElement

function render(user: { username: string } | null) {
  if (user) {
    signedOut.hidden = true
    signedIn.hidden = false
    username.textContent = user.username
    userJson.textContent = JSON.stringify(user, null, 2)
  } else {
    signedOut.hidden = false
    signedIn.hidden = true
  }
}

// Bootstrap: try to resolve the current user from the cookie set on a previous visit.
client
  .getCurrentUser()
  .then(render)
  .catch(() => render(null))

form.addEventListener('submit', async e => {
  e.preventDefault()
  submit.disabled = true
  const email = (document.getElementById('email') as HTMLInputElement).value
  const password = (document.getElementById('password') as HTMLInputElement).value
  try {
    const user = await client.loginWithCookie(email, password)
    render(user)
  } catch (err) {
    const message = err instanceof AuthError ? err.message : 'Login failed'
    alert(message)
  } finally {
    submit.disabled = false
  }
})

logoutButton.addEventListener('click', async () => {
  await client.logout()
  render(null)
})
