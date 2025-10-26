# 🔐 OAuth Social Login Setup Guide

**EZAuth supporte maintenant l'authentification via Google (GitHub à venir) !**

## ✅ Implémenté

- ✅ Backend OAuth flow (Passport.js)
- ✅ Google OAuth stratégie
- ✅ Account linking automatique (si email existe)
- ✅ Nouvelle collection MongoDB `oauth_accounts`
- ✅ Boutons UI "Continue with Google"
- ✅ Compatibilité avec flow SSO actuel
- ✅ Users OAuth-only (sans password)

## 📋 Setup Google OAuth (Development)

### 1. Créer un projet Google Cloud

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un nouveau projet (ou utiliser un existant)
3. Activer "Google+ API" dans APIs & Services

### 2. Configurer OAuth Consent Screen

1. Aller dans **APIs & Services > OAuth consent screen**
2. Choisir **External** (pour tester avec n'importe quel compte Google)
3. Remplir les infos obligatoires :
   - **App name** : EZAuth
   - **User support email** : Votre email
   - **Developer contact** : Votre email
4. **Scopes** : Ajouter `email` et `profile` (par défaut)
5. **Test users** : Ajouter vos emails de test
6. Sauvegarder

### 3. Créer OAuth 2.0 Credentials

1. Aller dans **APIs & Services > Credentials**
2. Cliquer **Create Credentials > OAuth 2.0 Client ID**
3. **Application type** : Web application
4. **Name** : EZAuth Local Dev
5. **Authorized redirect URIs** :
   ```
   http://localhost:5010/api/auth/google/callback
   ```
6. Cliquer **Create**
7. **Copier** le Client ID et Client Secret

### 4. Configurer .env.local

```bash
cd apps/ezauth/api
cp .env.example .env.local
```

Éditer `.env.local` :
```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=http://localhost:5010/api/auth/google/callback
```

### 5. Redémarrer l'API

```bash
pnpm dev:auth  # ou pnpm dev
```

Vérifier les logs :
```
✅ Models initialized (AuthUser, AuthCode, OAuthAccount)
```

Si tu vois :
```
⚠️  [OAuth] Google OAuth not configured
```
→ Vérifie que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont bien dans `.env.local`

## 🧪 Tester le Flow OAuth

### 1. Login Page

1. Ouvrir http://localhost:5015/login?app=ezbill&redirect_uri=http://localhost:5025/auth/callback
2. Tu devrais voir le bouton **"Continue with Google"**
3. Cliquer dessus

### 2. Flow Google OAuth

1. Redirection vers Google (page de sélection de compte)
2. Choisir un compte Google
3. Accepter les permissions (email, profile)
4. Redirection vers `/api/auth/google/callback`

### 3. Callback & Account Linking

**Cas 1 : Nouvel utilisateur**
- Crée un compte EZAuth avec l'email Google
- Username généré automatiquement (ex: `johndoe`)
- `passwordHash` = null (OAuth-only user)
- Crée un lien dans `oauth_accounts`

**Cas 2 : Email existant**
- Lie le compte Google au compte EZAuth existant
- Met à jour l'avatar si non-défini
- Continue avec le compte existant

**Cas 3 : OAuth account déjà lié**
- Login direct avec le compte existant

### 4. Résultat Final

→ Redirection vers `http://localhost:5025/auth/callback?code=abc123`
→ Flow SSO normal (échange code → token)
→ User connecté sur EZBill ✅

## 📊 Base de Données

### Collection `auth_users`

```js
{
  _id: ObjectId("..."),
  email: "john@gmail.com",
  username: "johndoe",
  passwordHash: null,  // ← OAuth-only user
  avatar: "https://lh3.googleusercontent.com/...",
  isVerified: true,
  apps: ["ezbill", "tower-defense"],
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Collection `oauth_accounts`

```js
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // Référence auth_users
  provider: "google",
  providerId: "1234567890",  // Google user ID
  email: "john@gmail.com",
  displayName: "John Doe",
  avatar: "https://lh3.googleusercontent.com/...",
  accessToken: "ya29.xxx",  // TODO: Encrypt in production
  refreshToken: "1//xxx",   // TODO: Encrypt in production
  profile: { /* raw Google profile */ },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

## 🔐 Sécurité

### Development vs Production

**Development** :
- `http://localhost:5010/api/auth/google/callback`
- Test users dans Google OAuth Consent

**Production** :
- `https://ezauth.up.railway.app/api/auth/google/callback`
- Publish OAuth Consent Screen (review Google)
- Encrypt `accessToken` et `refreshToken` (TODO)

### Redirect URI Validation

Passport vérifie automatiquement que la redirect URI est autorisée dans Google Cloud Console.

### CSRF Protection

Le paramètre `state` contient `{ app, redirect_uri }` pour éviter les attaques CSRF.

## 🚀 Production Deployment

### 1. Railway Variables

```env
GOOGLE_CLIENT_ID=prod-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=prod-client-secret
GOOGLE_CALLBACK_URL=https://ezauth.up.railway.app/api/auth/google/callback
```

### 2. Google Cloud Console

Ajouter la redirect URI de production :
```
https://ezauth.up.railway.app/api/auth/google/callback
```

### 3. OAuth Consent Screen

- Changer de **Testing** → **In production**
- Soumettre pour review Google (peut prendre 1-2 semaines)
- En attendant : max 100 test users

## 📝 Ajouter GitHub OAuth (TODO)

1. Installer `passport-github2` :
   ```bash
   pnpm add passport-github2 @types/passport-github2
   ```

2. Créer stratégie dans `config/passport.ts`

3. Ajouter routes dans `routes/oauth.routes.ts`

4. Ajouter bouton dans `OAuthButtons.tsx`

5. Configurer GitHub App :
   - https://github.com/settings/developers
   - Authorization callback URL: `http://localhost:5010/api/auth/github/callback`

## 🎯 Avantages OAuth

✅ **UX améliorée** - Login en 1 clic
✅ **Pas de password** - Sécurité déléguée à Google/GitHub
✅ **Account linking** - Email existant → lie automatiquement
✅ **Avatar automatique** - Photo de profil importée
✅ **Email vérifié** - Pas besoin de vérification email
✅ **Compatible SSO** - Flow OAuth actuel inchangé

## 🐛 Troubleshooting

### Erreur "redirect_uri_mismatch"

→ Vérifie que l'URL dans Google Cloud Console correspond exactement :
```
http://localhost:5010/api/auth/google/callback
```

### Erreur "OAuth not configured"

→ Vérifie `.env.local` contient `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`

### Erreur "User already exists"

→ Normal ! C'est le flow de linking. Le compte OAuth est lié au compte existant.

### Pas de bouton Google visible

→ Vérifie que `OAuthButtons` est importé dans `login/page.tsx` et `register/page.tsx`

### Callback ne redirige pas

→ Vérifie que `redirect_uri` est passé dans l'URL :
```
/login?app=ezbill&redirect_uri=http://localhost:5025/auth/callback
```
