# 🛡️ Fix: CSRF State Parameter - OAuth2 Best Practice

**Date:** 27 Octobre 2025
**Priority:** Medium (Security enhancement)
**Impact:** Faible (seulement si attacker connaît le code authorization avant expiration)

---

## Problème Actuel

```typescript
// client.ts - redirectToLogin()
const params = new URLSearchParams({
  app: this.config.appName,
  redirect_uri: this.config.redirectUri,
  // ❌ Manque : state parameter
})
```

**Risque:** Attacker pourrait forger un callback avec un code volé
**Probabilité:** Faible (code expire en 5 min, redirect_uri validé backend)
**Severity:** Medium

---

## Solution Recommandée

### 1. Modifier `client.ts`

```typescript
// src/client.ts

export class AuthClient {
  // ... existing code ...

  // Redirect to EZAuth login page
  redirectToLogin(additionalParams?: Record<string, string>) {
    // ✅ Generate random state
    const state = this.generateState()

    // ✅ Store in sessionStorage (survit pas à fermeture onglet)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ezauth_oauth_state', state)
    }

    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      state,  // ✅ ADD state parameter
      ...additionalParams,
    })

    const authUrl = `${this.urls.webBaseURL}/login?${params.toString()}`
    window.location.href = authUrl
  }

  // Redirect to EZAuth register page
  redirectToRegister(additionalParams?: Record<string, string>) {
    // ✅ Same logic
    const state = this.generateState()

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ezauth_oauth_state', state)
    }

    const params = new URLSearchParams({
      app: this.config.appName,
      redirect_uri: this.config.redirectUri,
      state,  // ✅ ADD
      ...additionalParams,
    })

    const authUrl = `${this.urls.webBaseURL}/register?${params.toString()}`
    window.location.href = authUrl
  }

  // Exchange authorization code for access token
  async exchangeCode(code: string, state?: string): Promise<AuthToken> {
    // ✅ Verify state BEFORE exchanging code
    if (typeof window !== 'undefined') {
      const savedState = sessionStorage.getItem('ezauth_oauth_state')

      if (state && savedState !== state) {
        throw new Error('Invalid state parameter - possible CSRF attack')
      }

      // ✅ Clean up after verification
      sessionStorage.removeItem('ezauth_oauth_state')
    }

    const response = await fetch(`${this.config.baseURL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        app: this.config.appName,
        redirect_uri: this.config.redirectUri,
      }),
    })

    // ... rest of code unchanged
  }

  // ✅ Helper to generate cryptographically secure state
  private generateState(): string {
    if (typeof window !== 'undefined' && window.crypto) {
      // Modern browsers
      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    }

    // Fallback (moins sécurisé mais acceptable)
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}
```

### 2. Modifier `auth-callback-page.tsx`

```typescript
// src/auth-callback-page.tsx

function CallbackContent({ ... }: AuthCallbackPageProps) {
  const { handleCallback } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const [code, setCode] = useState<string | null>(null)
  const [state, setState] = useState<string | null>(null)  // ✅ ADD

  // Extract code AND state from URL
  useEffect(() => {
    console.log('🚀 [AuthCallbackPage] URL extraction')

    const authCode = searchParams.get('code')
    const authState = searchParams.get('state')  // ✅ ADD

    if (authCode && !code) {
      console.log('🔗 [AuthCallbackPage] Extracted code + state')
      setCode(authCode)
      setState(authState)  // ✅ Save state

      // Clean URL immediately
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (!authCode && !code) {
      console.log('❌ No authorization code found')
      setStatus('error')
      setError('No authorization code found')
    }
  }, [searchParams, code])

  // Process callback with state verification
  useEffect(() => {
    if (!code || status !== 'loading') return

    const lockKey = `auth_processing_${code}`
    if ((window as any)[lockKey]) return

    const processCallback = async () => {
      (window as any)[lockKey] = true

      try {
        console.log('🔄 Processing callback with state verification')

        // ✅ Pass state to handleCallback
        await handleCallback(code, state ?? undefined)

        console.log('✅ Callback processed successfully')
        setStatus('success')
        setTimeout(() => router.push(redirectTo), 1500)
      } catch (err) {
        console.error('❌ Auth callback error:', err)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        delete (window as any)[lockKey]
      }
    }

    const timeoutId = setTimeout(processCallback, 100)
    return () => clearTimeout(timeoutId)
  }, [code, state, handleCallback, router, status, redirectTo])  // ✅ Add state to deps

  // ... rest unchanged
}
```

### 3. Modifier `provider.tsx`

```typescript
// src/provider.tsx

export function useAuth() {
  const { client } = useAuthContext()
  const store = useAuthStore()

  // ... existing code ...

  // ✅ Update handleCallback signature
  const handleCallback = async (code: string, state?: string) => {
    try {
      // ✅ Pass state to client.exchangeCode
      const authResult = await client.exchangeCode(code, state)
      store.setAuth(authResult.user, authResult.access_token)
      return authResult.user
    } catch (error) {
      console.error('Auth callback error:', error)
      throw error
    }
  }

  return {
    // State
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,

    // Actions
    login,
    register,
    logout: store.logout,
    handleCallback,  // ✅ Now accepts state parameter
    verifyAndRefresh,
  }
}
```

### 4. Backend Change (EZAuth API)

```typescript
// apps/ezauth/api/src/routes/auth.ts

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, app, redirect_uri, state } = req.body  // ✅ Accept state

  // ... existing login logic ...

  // Create auth code
  const code = await AuthCode.create({
    userId: user._id,
    app,
    redirect_uri,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)  // 5 min
  })

  // ✅ Include state in redirect
  const callbackUrl = new URL(redirect_uri)
  callbackUrl.searchParams.set('code', code.code)
  if (state) {
    callbackUrl.searchParams.set('state', state)  // ✅ Pass state back
  }

  res.redirect(callbackUrl.toString())
})

// POST /api/auth/register - Same logic
```

---

## Testing

```typescript
// Test manuel
1. Login → Vérifier URL contient `state=...`
2. EZAuth callback → Vérifier state retourné
3. Modifier state dans URL → Doit échouer avec "Invalid state"
4. Callback sans state → Doit fonctionner (backward compatibility)
```

---

## Impact

**Breaking Changes:** ❌ Non (state optionnel pour backward compatibility)

**Migration Required:** ❌ Non (auto-upgrade transparent)

**Performance:** ✅ Négligeable (1 sessionStorage call)

**Security:** ✅ +5 points (CSRF protection)

---

## Alternative: Simplifier avec Backend Validation

Si tu veux **éviter le code frontend**, EZAuth API peut valider côté serveur :

```typescript
// Backend only approach
// EZAuth API vérifie que redirect_uri + app match exactement
// + Code expiration 5 min
// = Suffisant dans ton cas !

// Pas besoin de state parameter si :
// ✅ redirect_uri strict validation
// ✅ Code expiration courte
// ✅ Rate limiting sur /token endpoint
```

**Recommandation:** Garde le code actuel, ajoute juste rate limiting backend
```typescript
// apps/ezauth/api/src/routes/auth.ts
import rateLimit from 'express-rate-limit'

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 10,  // Max 10 tentatives par IP
  message: 'Too many token requests'
})

router.post('/token', tokenLimiter, async (req, res) => {
  // ... existing code
})
```

---

## Conclusion

**Option 1:** Implémenter state parameter (OAuth2 standard) → +30 min dev
**Option 2:** Rate limiting backend seulement → +5 min dev ⭐ RECOMMANDÉ

Pour ton use case (apps internes monorepo), **Option 2 suffit largement** !
