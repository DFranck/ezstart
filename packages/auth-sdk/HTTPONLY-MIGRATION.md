# 🔒 HttpOnly Cookies Migration Guide

**Status:** Phase 2 Complete ✅ (Backend + SDK Dual-Mode)

---

## 🎯 Overview

Migration progressive de localStorage vers httpOnly cookies pour améliorer la sécurité.

**Avantages:**
- ✅ **XSS Protection** - JavaScript ne peut pas lire le token
- ✅ **CSRF Protection** - sameSite='lax' + CORS credentials
- ✅ **Stay Logged In** - Cookie maxAge=7 days
- ✅ **SSO Preserved** - Fonctionne avec OAuth Google/GitHub
- ✅ **0 Breaking Changes** - Migration progressive, app par app

---

## 📊 Architecture Dual-Mode

### Backend (EZAuth API)

**Supporte 2 modes simultanément:**
- ✅ Mode localStorage (Authorization header)
- ✅ Mode httpOnly (cookie)

**Endpoints:**
```typescript
POST /api/auth/login-cookie       // Login direct avec cookie
POST /api/auth/logout             // Clear cookie
GET  /api/auth/me                 // Dual-mode (cookie OU header)
```

**Configuration:**
```typescript
// apps/ezauth/api/src/index.ts
import cookieParser from 'cookie-parser'

app.use(cookieParser())
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true  // ⚡ CRITICAL pour cookies
}))
```

### SDK (@ezstart/auth-sdk)

**Opt-in Flag:**
```typescript
<AuthProvider appName="ezbill" useHttpOnlyCookies={true}>
  {children}
</AuthProvider>
```

**AuthState Extended:**
```typescript
interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
  mode: AuthMode  // 'localStorage' | 'httpOnly'

  setAuth: (user, accessToken?, mode?) => void
  logout: () => void
  getMode: () => AuthMode
}
```

**AuthClient Methods:**
```typescript
// Login avec cookie
await authClient.loginWithCookie(email, password)

// Logout (clear cookie + store)
await authClient.logout()

// Get user (dual-mode)
await authClient.getCurrentUser(accessToken?)
```

---

## 🚀 Migration par App

### Apps Migrées

| App | Status | Date | Notes |
|-----|--------|------|-------|
| EZBill | ⏳ TODO | - | 30 min |
| Tower Defense | ⏳ TODO | - | 30 min |
| FengShui | ⏳ TODO | - | 45 min |
| ASC-TCD | ⏳ TODO | - | 30 min |
| GreenPulse | ⏳ TODO | - | 1h |
| EZPay | ⏳ TODO | - | 45 min |
| EZStart | ⏳ TODO | - | 1h |

**Total:** ~5h sur 1 semaine

### Étapes par App

**1. Activer httpOnly dans AuthProvider**
```typescript
// apps/[app]/web/src/app/layout.tsx
<AuthProvider
  appName="ezbill"
  useHttpOnlyCookies={true}  // ⚡ Enable httpOnly
>
  {children}
</AuthProvider>
```

**2. Créer/Modifier API Wrapper**
```typescript
// apps/[app]/web/src/lib/api.ts
export async function callApi<T>(endpoint: string, options = {}) {
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',  // ⚡ CRITICAL pour cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
```

**3. Remplacer fetch() Directs**
```typescript
// ❌ AVANT
const res = await fetch('/api/invoices')

// ✅ APRÈS
import { callApi } from '@/lib/api'
const res = await callApi('/invoices')
```

**4. Tester**
```bash
# 1. Login
# 2. Vérifier cookie dans DevTools (Application > Cookies)
# 3. Rafraîchir page → Toujours logged in
# 4. Logout → Cookie supprimé
```

---

## 🐛 Fixes Appliqués

### Fix 1: State Parameter (OAuth)

**Problème:** OAuth callback échouait avec state mismatch

**Solution:**
```typescript
// Stocker state dans sessionStorage
sessionStorage.setItem('oauth_state', state)

// Vérifier state au callback
const savedState = sessionStorage.getItem('oauth_state')
if (savedState !== params.state) {
  throw new Error('Invalid state parameter')
}
```

### Fix 2: Token Expiration

**Problème:** Tokens expiraient trop vite (1h)

**Solution:**
```typescript
// Backend: JWT expire = 7 jours
jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })

// Frontend: Cookie maxAge = 7 jours
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 jours
})
```

### Fix 3: CORS Credentials

**Problème:** Cookies pas envoyés avec fetch()

**Solution:**
```typescript
// Toujours inclure credentials
fetch(url, {
  credentials: 'include'  // ⚡ CRITICAL
})
```

---

## ⚠️ Règles Critiques

### Backend

❌ **INTERDICTIONS**
1. **JAMAIS** exposer token dans response body (mode httpOnly)
2. **JAMAIS** oublier `credentials: true` dans CORS
3. **JAMAIS** utiliser `sameSite: 'strict'` (bloque OAuth)

✅ **OBLIGATIONS**
1. **TOUJOURS** set httpOnly cookie sur login
2. **TOUJOURS** clear cookie sur logout
3. **TOUJOURS** vérifier cookie ET header dans `/me`

### Frontend

❌ **INTERDICTIONS**
1. **JAMAIS** stocker token dans localStorage (mode httpOnly)
2. **JAMAIS** oublier `credentials: 'include'` dans fetch
3. **JAMAIS** mixer les modes (une app = un mode)

✅ **OBLIGATIONS**
1. **TOUJOURS** utiliser wrapper API avec credentials
2. **TOUJOURS** tester cookie persistence après refresh
3. **TOUJOURS** clear store + cookie sur logout

---

## 🧪 Testing Checklist

### Par App

```bash
# 1. Login
✓ Cookie set dans DevTools
✓ User state populated
✓ Redirect vers dashboard

# 2. Navigation
✓ API calls marchent (credentials: 'include')
✓ Protected routes accessibles
✓ User state persiste

# 3. Refresh
✓ Cookie toujours présent
✓ Auto-login fonctionne
✓ User state restauré

# 4. Logout
✓ Cookie supprimé
✓ Store cleared
✓ Redirect vers login
```

### Production

```bash
# 1. HTTPS obligatoire
✓ Cookie secure=true
✓ CORS origins correctes
✓ sameSite='lax'

# 2. OAuth
✓ Google login fonctionne
✓ GitHub login fonctionne
✓ State parameter validé
```

---

## 📚 Documentation

**Backend:**
- [apps/ezauth/api/README.md](../../apps/ezauth/api/README.md)
- Cookie configuration dans `src/index.ts`

**SDK:**
- [README.md](./README.md)
- Dual-mode implementation dans `src/store/authStore.ts`

**Docs:**
- [PHASE-1-COMPLETE.md](../../PHASE-1-COMPLETE.md)
- [PHASE-2-COMPLETE.md](../../PHASE-2-COMPLETE.md)

---

## 🎯 Prochaines Étapes

1. Migrer EZBill (proof of concept)
2. Migrer Tower Defense
3. Migrer autres apps
4. Supprimer mode localStorage (breaking change majeur)
5. Documentation utilisateur final
