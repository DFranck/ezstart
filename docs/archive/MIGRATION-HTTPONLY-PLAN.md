# 🔄 Plan de Migration httpOnly Cookies - SANS RIEN CASSER

**Date:** 27 Octobre 2025
**Stratégie:** Dual-mode (localStorage + httpOnly) → Migration progressive → Cleanup
**Durée totale:** 2 semaines
**Apps concernées:** 7 apps (ezstart, ezbill, ezpay, fengshui, tower-defense, asc-tcd, green-pulse)

---

## 🎯 Principe: Backward Compatible

**Phase 1:** Backend supporte **DUAL MODE** (localStorage + httpOnly)
**Phase 2:** SDK supporte **DUAL MODE** (detect et utilise le mode disponible)
**Phase 3:** Apps migrent **UNE PAR UNE** vers httpOnly
**Phase 4:** Cleanup ancien code localStorage

**✅ À AUCUN MOMENT une app ne casse !**

---

## 📊 État Actuel - Apps Utilisant EZAuth

| App | AuthProvider | Status | Notes |
|-----|--------------|--------|-------|
| **ezstart** | ✅ `appName="ezstart"` | 🟢 Active | providers.tsx |
| **ezbill** | ✅ `appName="ezbill"` | 🟢 Active | layout.tsx |
| **ezpay** | ✅ `appName="ezpay"` | 🟢 Active | layout.tsx |
| **fengshui** | ✅ `appName="fengshui"` | 🟢 Active | layout.tsx |
| **tower-defense** | ✅ `appName="tower-defense"` | 🟢 Active | providers.tsx |
| **asc-tcd** | ✅ `appName="asc-tcd"` | 🟢 Active | providers.tsx |
| **green-pulse** | ✅ `appName="green-pulse"` | 🟢 Active | providers.tsx |
| **ezauth** | ⚠️ N/A (auth service itself) | 🟠 Special | - |

**Total:** 7 apps à migrer progressivement

---

## 🔧 Phase 1: Backend Dual-Mode (2h) ✅ SAFE

### Objectif
Backend EZAuth API supporte **2 modes simultanément:**
1. **Mode localStorage** (actuel) - `/api/auth/token` endpoint
2. **Mode httpOnly** (nouveau) - Set cookie + redirect

### Implementation

#### 1.1 Install Dependencies

```bash
cd apps/ezauth/api
pnpm add cookie-parser passport passport-google-oauth20 @types/cookie-parser @types/passport
```

#### 1.2 Ajouter Middleware Cookie

```typescript
// apps/ezauth/api/src/index.ts
import cookieParser from 'cookie-parser'

const app = createApp({ apiApp: 'ezauth' })

// ✅ ADD cookie parser middleware
app.use(cookieParser())

// Existing routes...
app.use('/api/auth', routes)
```

#### 1.3 Modifier CORS (Allow Credentials)

```typescript
// apps/ezauth/api/src/index.ts
import { createCorsConfig } from '@ezstart/config/cors'

// ✅ MODIFY - Add credentials support
app.use(cors({
  ...createCorsConfig('ezauth'),
  credentials: true  // ✅ CRITICAL for cookies
}))
```

#### 1.4 Créer Dual-Mode Login

```typescript
// apps/ezauth/api/src/routes/auth.ts (NOUVEAU ENDPOINT)

/**
 * POST /api/auth/login-cookie (NOUVEAU - httpOnly mode)
 * Dual-mode compatible: Set cookie + return user
 */
router.post('/login-cookie', async (req, res) => {
  const { email, password, app, redirect_uri } = req.body

  try {
    // 1. Validate credentials (same as before)
    const user = await getAuthUserModel().then(Model => Model.findOne({ email }))

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' })
    }

    // 2. Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        apps: user.apps
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    // 3. ✅ Set httpOnly cookie
    res.cookie('ezauth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined
    })

    // 4. ✅ Return user info (SDK will store in localStorage for client-side access)
    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        apps: user.apps,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

/**
 * POST /api/auth/token (EXISTING - localStorage mode)
 * ✅ KEEP for backward compatibility
 */
router.post('/token', async (req, res) => {
  // ... existing code unchanged
  // Apps not migrated yet still use this
})

/**
 * GET /api/auth/me (MODIFY - Support both modes)
 */
router.get('/me', async (req, res) => {
  try {
    // ✅ Try httpOnly cookie first
    let token = req.cookies.ezauth_token

    // ✅ Fallback to Authorization header (localStorage mode)
    if (!token) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    // Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Get user
    const user = await getAuthUserModel().then(Model => Model.findById(payload.userId))

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' })
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        apps: user.apps,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
})

/**
 * POST /api/auth/logout (NOUVEAU - Clear cookie)
 */
router.post('/logout', (req, res) => {
  res.clearCookie('ezauth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined
  })

  res.json({ success: true })
})
```

### ✅ Test Backend Dual-Mode

```bash
# Test 1: Mode localStorage (existing apps)
curl -X POST http://localhost:5010/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","app":"ezbill"}'
# → Should return { code: "..." }

curl -X POST http://localhost:5010/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC123","app":"ezbill"}'
# → Should return { access_token: "...", user: {...} }

# Test 2: Mode httpOnly (new)
curl -X POST http://localhost:5010/api/auth/login-cookie \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","app":"ezbill"}' \
  -c cookies.txt
# → Should set cookie + return { success: true, user: {...} }

curl -X GET http://localhost:5010/api/auth/me \
  -b cookies.txt
# → Should return { user: {...} } using cookie
```

---

## 🔧 Phase 2: SDK Dual-Mode Support (1h) ✅ SAFE

### Objectif
`@ezstart/auth-sdk` détecte automatiquement le mode et utilise la bonne méthode.

### Implementation

#### 2.1 Ajouter Mode Detection dans Store

```typescript
// packages/auth-sdk/src/store.ts

export type AuthMode = 'localStorage' | 'httpOnly'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null  // ✅ Keep for localStorage mode
  tokenExpiresAt: number | null
  isAuthenticated: boolean
  mode: AuthMode  // ✅ NEW - Track current mode

  setAuth: (user: AuthUser, accessToken?: string, mode?: AuthMode) => void
  logout: () => void
  updateUser: (user: AuthUser) => void
  isTokenExpired: () => boolean
  getMode: () => AuthMode  // ✅ NEW
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      mode: 'localStorage',  // ✅ Default to localStorage (backward compatible)

      setAuth: (user: AuthUser, accessToken?: string, mode: AuthMode = 'localStorage') => {
        let tokenExpiresAt: number | null = null

        if (accessToken) {
          const payload = parseJWT(accessToken)
          tokenExpiresAt = payload?.exp ?? null
        }

        set({
          user,
          accessToken,
          tokenExpiresAt,
          isAuthenticated: true,
          mode  // ✅ Store mode
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          tokenExpiresAt: null,
          isAuthenticated: false,
          mode: 'localStorage'  // Reset to default
        })
      },

      updateUser: (user: AuthUser) => {
        set((state) => ({ ...state, user }))
      },

      isTokenExpired: () => {
        const state = get()
        if (!state.tokenExpiresAt) return false

        const now = Math.floor(Date.now() / 1000)
        return now >= state.tokenExpiresAt
      },

      getMode: () => get().mode
    }),
    {
      name: 'ezauth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
        mode: state.mode  // ✅ Persist mode
      })
    }
  )
)
```

#### 2.2 Modifier Client pour Dual-Mode

```typescript
// packages/auth-sdk/src/client.ts

export class AuthClient {
  private config: AuthClientConfig
  private urls: ReturnType<typeof getEZAuthUrls>

  // ... existing code ...

  /**
   * Login with httpOnly cookie mode (NEW)
   */
  async loginWithCookie(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseURL}/login-cookie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // ✅ CRITICAL for cookies
      body: JSON.stringify({
        email,
        password,
        app: this.config.appName
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Login failed')
    }

    return result.user
  }

  /**
   * Get current user (supports both modes)
   */
  async getCurrentUser(accessToken?: string): Promise<AuthUser> {
    const headers: HeadersInit = {}

    // If accessToken provided (localStorage mode), use Authorization header
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${this.config.baseURL}/me`, {
      headers,
      credentials: 'include'  // ✅ Always include (for cookie mode)
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const result = await response.json()
    return result.user
  }

  /**
   * Logout (supports both modes)
   */
  async logout(): Promise<void> {
    // Clear httpOnly cookie (if exists)
    await fetch(`${this.config.baseURL}/logout`, {
      method: 'POST',
      credentials: 'include'
    })
  }

  // ✅ KEEP existing methods for backward compatibility
  // exchangeCode(), verifyToken(), etc.
}
```

#### 2.3 Modifier Provider pour Opt-in httpOnly

```typescript
// packages/auth-sdk/src/provider.tsx

interface AuthProviderProps {
  children: ReactNode
  appName: string
  useHttpOnlyCookies?: boolean  // ✅ NEW - Opt-in flag
}

export function AuthProvider({
  children,
  appName,
  useHttpOnlyCookies = false  // ✅ Default false (backward compatible)
}: AuthProviderProps) {
  const store = useAuthStore()
  const client = createAuthClient({ appName, redirectUri: '...' })

  // ... existing code ...

  return <AuthContext.Provider value={{ client, useHttpOnlyCookies }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const { client, useHttpOnlyCookies } = useAuthContext()
  const store = useAuthStore()

  // ✅ Mode-aware login
  const login = async (email?: string, password?: string) => {
    if (useHttpOnlyCookies && email && password) {
      // httpOnly mode: direct login
      const user = await client.loginWithCookie(email, password)
      store.setAuth(user, undefined, 'httpOnly')
      return user
    } else {
      // localStorage mode: redirect to EZAuth
      client.redirectToLogin()
      return new Promise(() => {})
    }
  }

  // ✅ Mode-aware logout
  const logout = async () => {
    await client.logout()  // Clear cookie (if exists)
    store.logout()  // Clear localStorage
  }

  return {
    user: store.user,
    accessToken: store.accessToken,
    isAuthenticated: store.isAuthenticated,
    mode: store.getMode(),
    login,
    logout,
    handleCallback,
    verifyAndRefresh
  }
}
```

---

## 🔧 Phase 3: Migration Progressive Apps (1h/app)

### App par App - Checklist

**Pour chaque app:**

#### Step 1: Enable httpOnly Mode

```typescript
// apps/ezbill/web/src/app/[locale]/layout.tsx

// BEFORE
<AuthProvider appName="ezbill">{children}</AuthProvider>

// AFTER
<AuthProvider appName="ezbill" useHttpOnlyCookies={true}>  {/* ✅ Opt-in */}
  {children}
</AuthProvider>
```

#### Step 2: Update API Calls avec credentials

```typescript
// apps/ezbill/web/src/lib/api.ts (CREATE if not exists)

export async function callApi(endpoint: string, options?: RequestInit) {
  return fetch(endpoint, {
    ...options,
    credentials: 'include',  // ✅ Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })
}

// Replace all fetch() calls
// BEFORE
const invoices = await fetch('/api/invoices').then(r => r.json())

// AFTER
import { callApi } from '@/lib/api'
const invoices = await callApi('/api/invoices').then(r => r.json())
```

#### Step 3: Test App

```bash
# 1. Login
# 2. Check cookie in DevTools → Application → Cookies → ezauth_token
# 3. Navigate pages → Should stay logged in
# 4. Refresh page → Should stay logged in
# 5. Logout → Cookie should be cleared
```

### Ordre de Migration Recommandé

| Ordre | App | Raison | Effort |
|-------|-----|--------|--------|
| 1 | **ezbill** | Simple, pas de PayProvider | 30 min |
| 2 | **tower-defense** | Game, isolated | 30 min |
| 3 | **asc-tcd** | Small app | 30 min |
| 4 | **fengshui** | Has PayProvider, test interaction | 45 min |
| 5 | **green-pulse** | React Query, more complex | 1h |
| 6 | **ezpay** | Has PayProvider | 45 min |
| 7 | **ezstart** | Main app, migrate last (safest) | 1h |

---

## ✅ Validation à Chaque Étape

### Phase 1 Backend ✅

```bash
# Test existing apps still work (localStorage mode)
curl http://localhost:5010/api/auth/token  # Should work

# Test new httpOnly endpoint works
curl -c cookies.txt http://localhost:5010/api/auth/login-cookie
curl -b cookies.txt http://localhost:5010/api/auth/me  # Should work
```

### Phase 2 SDK ✅

```bash
# Build SDK
cd packages/auth-sdk
pnpm build

# Check all apps still compile
pnpm typecheck  # Should pass
```

### Phase 3 App Migration ✅

**Pour chaque app:**
- [ ] Login works
- [ ] User state persists
- [ ] Navigation works
- [ ] Logout works
- [ ] Cookie visible in DevTools
- [ ] No console errors

---

## 📅 Timeline

**Semaine 1:**
- Jour 1: Phase 1 Backend (2h)
- Jour 2: Phase 2 SDK (1h) + Test
- Jour 3: Migrer EZBill + Tower Defense (1h)
- Jour 4: Migrer ASC-TCD + FengShui (1h30)
- Jour 5: Test et validation

**Semaine 2:**
- Jour 1: Migrer GreenPulse (1h)
- Jour 2: Migrer EZPay (1h)
- Jour 3: Migrer EZStart (1h)
- Jour 4: Final testing toutes apps
- Jour 5: Cleanup + Documentation

---

## 🧹 Phase 4: Cleanup (Optionnel - Après validation 100%)

**Après que TOUTES les apps sont migrées et validées en production:**

### Remove localStorage mode

```typescript
// packages/auth-sdk/src/store.ts
// Remove accessToken field
// Remove mode tracking
// Simplify to httpOnly only

// apps/ezauth/api/src/routes/auth.ts
// Remove /api/auth/token endpoint
// Remove /api/auth/login old flow
```

**⚠️ NE FAIRE QUE SI 100% DES APPS MIGRÉES ET VALIDÉES EN PROD !**

---

## 🔴 Rollback Plan (Si Problème)

**Si une app a un problème après migration:**

```typescript
// Rollback immédiat: Remove flag
<AuthProvider appName="ezbill" useHttpOnlyCookies={false}>  {/* ✅ Back to localStorage */}
```

**Backend reste compatible → Aucune perte de données**

---

**Prêt à commencer ?** Je vais implémenter Phase 1 (Backend) maintenant.
