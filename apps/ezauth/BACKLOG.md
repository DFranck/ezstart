# Backlog — EZAuth

**Status :** `active` | **Derniere mise a jour :** 2026-03-29

## Objectif

SSO Authentication service pour le monorepo @ezstart (API + Web).

---

## Audit complet — 2026-03-29

### Resume executif

EZAuth est fonctionnel pour les flows principaux (login, register, Google OAuth, SSO code exchange, RBAC). La base est solide : Zod validation sur toutes les routes auth, rate limiting en place, OAuth token encryption (AES-256-GCM), CSRF sur login-cookie, bcrypt hashing, dual-mode httpOnly/localStorage. Les principales lacunes sont : fonctionnalites manquantes critiques (password reset, email verification, 2FA), hardcoded strings dans le web, admin role checks utilisant le legacy `roles` au lieu de `globalRoles`/`appRoles`, et app enum desynchronisee avec les apps reelles du monorepo.

---

## P0 — Securite critique

### SEC-1: App enum desynchronisee `planned` (→ monorepo #60)

- **Probleme :** L'enum `apps` dans `auth-user.ts` et `auth-code.ts` liste `['ezbill', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd']` mais il manque `gacha-analyzer` et `ezpay`. L'enum dans `waitlist.ts` est aussi differente (pas `admin` mais inclut les autres).
- **Impact :** Les users de gacha-analyzer et ezpay ne peuvent pas etre enregistres avec ces apps.
- **Action :** Centraliser l'enum des apps dans `@ezstart/config` et l'importer partout.

### SEC-2: Admin role checks utilisent le legacy `roles` field `planned` (→ monorepo #61)

- **Probleme :** Toutes les routes admin (`list-users`, `get-user`, `invite-waitlist`, `list-waitlist`, `get-waitlist`) verifient `currentUser.roles?.includes('admin')` au lieu d'utiliser `globalRoles` ou `appRoles`. Le champ `roles` est marque DEPRECATED dans le model.
- **Impact :** Incoherence entre le systeme RBAC et les checks effectifs.
- **Action :** Migrer vers `globalRoles.includes('superadmin')` ou utiliser un middleware RBAC centralise.

### SEC-3: Token exchange (`/token`) sans rate limiting `planned` (→ monorepo #62)

- **Probleme :** Le endpoint `/token` (code-for-token exchange) n'a pas de rate limiter. Un attaquant pourrait bruteforce les auth codes.
- **Impact :** L'auth code est 64 chars hex donc bruteforce improbable, mais c'est une bonne pratique.
- **Action :** Ajouter `createStrictRateLimiter()`.

### SEC-4: `/me` endpoint sans middleware auth standard `planned`

- **Probleme :** `/me` reimplemente manuellement l'extraction du token au lieu d'utiliser `verifyTokenMiddleware`. Code duplique avec le middleware.
- **Action :** Utiliser `verifyTokenMiddleware` et acceder a `req.user`.

### SEC-5: Crypto key derivation utilise JWT_SECRET `planned`

- **Probleme :** `utils/crypto.ts` derive la cle AES de `JWT_SECRET`. Si JWT_SECRET leak, les tokens OAuth encrypts sont aussi compromis.
- **Action :** Utiliser une variable d'env separee `OAUTH_ENCRYPTION_KEY`.

### SEC-6: Waitlist public endpoints sans rate limiting `planned` (→ monorepo #62)

- **Probleme :** `POST /:appName/add` (ajout waitlist) et `GET /:appName/status/:email` (check status) n'ont pas de rate limiter.
- **Impact :** Spam de la waitlist ou enumeration d'emails.
- **Action :** Ajouter rate limiting sur ces endpoints.

### SEC-7: Waitlist GET endpoints publics sans auth `planned`

- **Probleme :** `GET /waitlist/:appName` et `GET /waitlist/` (list all) sont publics et retournent toutes les emails.
- **Impact :** Leak de toutes les adresses email de la waitlist.
- **Action :** Ajouter `verifyTokenMiddleware` + admin check, ou limiter les infos retournees.

---

## P1 — Fonctionnalites manquantes

### FEAT-1: Password reset flow `planned`

- **Quoi :** Forgot password -> email avec lien/code -> reset password.
- **Pourquoi :** Fonctionnalite basique attendue par tout service auth.
- **Etapes :**
  - [ ] Endpoint `POST /auth/forgot-password` (envoie email)
  - [ ] Endpoint `POST /auth/reset-password` (avec token)
  - [ ] Model `PasswordResetToken` (ou reutiliser AuthCode)
  - [ ] Page web `/forgot-password`
  - [ ] Integration email service

### FEAT-2: Email verification `planned`

- **Quoi :** Verifier l'email des users apres inscription.
- **Pourquoi :** `isVerified: true` est force a l'inscription ("for simplicity in v1"). Les users ne sont jamais verifies.
- **Etapes :**
  - [ ] Endpoint `POST /auth/send-verification`
  - [ ] Endpoint `POST /auth/verify-email` (avec token)
  - [ ] `isVerified: false` par defaut a l'inscription
  - [ ] Middleware pour bloquer les users non-verifies si necessaire
  - [ ] Integration email service

### FEAT-3: Email service `planned` (→ monorepo #68)

- **Quoi :** Service d'envoi d'emails (verification, password reset, invitations waitlist).
- **Pourquoi :** TODO present dans `invite-waitlist.ts` : "Send email with access code (implement email service later)".
- **Options :** Resend, SendGrid, ou AWS SES.

### FEAT-4: 2FA (Two-Factor Authentication) `planned`

- **Quoi :** TOTP (Google Authenticator) ou SMS.
- **Pourquoi :** Standard de securite pour un service auth SSO.
- **Etapes :**
  - [ ] Model pour stocker les secrets TOTP
  - [ ] Endpoints setup/verify/disable 2FA
  - [ ] UI dans le profil user
  - [ ] Integration dans le flow login

### FEAT-5: Account deletion (self-service) `planned`

- **Quoi :** Permettre a un user de supprimer son compte.
- **Pourquoi :** Requis par GDPR. Actuellement aucun endpoint DELETE user.
- **Etapes :**
  - [ ] Endpoint `DELETE /auth/account`
  - [ ] Suppression cascade (OAuth accounts, waitlist entries)
  - [ ] UI de confirmation

### FEAT-6: Session management UI `planned`

- **Quoi :** Dashboard des sessions actives + revocation.
- **Pourquoi :** Pas de moyen de voir ou invalider les sessions. Le JWT de 7 jours est stateless.
- **Options :** Token blacklist en Redis, ou refresh token rotation.

### FEAT-7: Refresh token rotation `planned`

- **Quoi :** Remplacer le JWT 7 jours unique par access token court (15min) + refresh token (30 jours) avec rotation.
- **Pourquoi :** Meilleure securite. Actuellement un seul JWT de 7 jours sans possibilite de revocation.

### FEAT-8: Admin — delete user endpoint `planned`

- **Quoi :** Endpoint `DELETE /admin/users/:id`.
- **Pourquoi :** Les admins peuvent lister, voir, et modifier les users mais pas les supprimer.

### FEAT-9: Admin — search/filter users `planned`

- **Quoi :** Le schema `listUsersQuerySchema` definit `search` et `role` mais ils ne sont jamais utilises dans le query builder.
- **Action :** Implementer le filtrage par recherche (email/username) et par role.

### FEAT-10: Profile update endpoint `planned`

- **Quoi :** Endpoint pour modifier son propre profil (firstName, lastName, avatar, password).
- **Pourquoi :** Aucun endpoint self-service pour modifier son profil.

---

## P2 — Qualite de code

### CODE-1: Hardcoded strings dans le web `planned`

- **Probleme :** Les pages login et register contiennent des strings en dur non-i18n :
  - `login/page.tsx` : "Sign in to access", "One account, all EZStart apps!", "Don't have an account?", "Sign up", "Loading..."
  - `register/page.tsx` : "Create account to access", "One account, all EZStart apps!", "Already have an account?", "Sign in", "Loading..."
  - `page.tsx` (home) : "Redirecting to login...", "Loading..."
- **Action :** Utiliser `useTranslations()` partout.

### CODE-2: `@ts-expect-error` Mongoose type issues (7 occurrences) `planned` (→ monorepo #64)

- **Fichiers :** `auth.service.ts`, `add.ts`, `get.ts`, `check-status.ts`, `list-waitlist.ts`, `get-waitlist.ts`, `invite-waitlist.ts`, `list.ts`.
- **Cause :** `getWaitlistModel()` retourne un type generique. Le model Waitlist n'a pas de type de retour precis.
- **Action :** Typer correctement `getWaitlistModel()` avec `Model<WaitlistDocument>`.

### CODE-3: `as any` casts (4 occurrences) `planned`

- **Fichiers :** `index.ts` (catch block), `auth.service.ts` (waitlist entry find), `AuthCode.test.ts` (model type), `express.d.ts` (index signature).
- **Action :** Typer correctement ou utiliser des narrowing patterns.

### CODE-4: Code duplique — JWT payload construction `planned` (→ monorepo #67)

- **Probleme :** La construction du JWT payload (userId, email, username, apps, roles, globalRoles, appRoles, permissions, features) est dupliquee 3 fois : `loginWithToken()`, `exchangeCodeForToken()`, et `verifyTokenMiddleware`.
- **Action :** Extraire dans une methode `buildJWTPayload(user)`.

### CODE-5: Code duplique — appRoles Map-to-Object conversion `planned`

- **Probleme :** La conversion `Map<string, string[]>` -> `Record<string, string[]>` est faite dans 5 endroits differents.
- **Action :** Extraire dans un util `mapToRecord()` ou dans le model.

### CODE-6: Code duplique — admin auth check `planned` (→ monorepo #61)

- **Probleme :** Le pattern `currentUser.roles?.includes('admin') || currentUser.roles?.includes('superadmin')` est repete dans 5 routes admin.
- **Action :** Extraire dans un middleware `requireAdmin` ou `requireRole('admin')`.

### CODE-7: Tests — couverture incomplete `planned` (→ monorepo #73)

- **Existant :** Tests pour AuthUser model et AuthCode model (bonne qualite).
- **Manquant :**
  - [ ] Tests OAuthAccount model
  - [ ] Tests Waitlist model
  - [ ] Tests AuthService (login, register, token exchange)
  - [ ] Tests OAuthService
  - [ ] Tests routes (integration)
  - [ ] Tests middleware auth

### CODE-8: Zod schemas non-partages `planned` (→ monorepo #65)

- **Probleme :** Les schemas Zod des routes admin (`userSchema`, `errorSchema`, `paginationSchema`) sont dupliques entre `list-users.ts`, `get-user.ts`, `update-user.ts`.
- **Action :** Centraliser dans un fichier `schemas/admin.ts`.

---

## P3 — UX Web

### UX-1: Pas de "Forgot password" link `planned`

- **Probleme :** Le formulaire login n'a pas de lien "Mot de passe oublie".
- **Prerequis :** FEAT-1 (Password reset flow).

### UX-2: Register form — pas de validation en temps reel `planned`

- **Probleme :** La validation email/username se fait uniquement au submit. Pas de verification d'unicite en temps reel.
- **Action :** Ajouter un endpoint `GET /auth/check-availability?email=...&username=...` et debounce dans le form.

### UX-3: Register form — password strength indicator `planned`

- **Probleme :** Juste "Minimum 6 characters" comme hint. Pas d'indicateur de force.
- **Action :** Ajouter un composant password strength (from `@ezstart/ui`).

### UX-4: Register form — pas de confirm password `planned`

- **Probleme :** Un seul champ password, pas de confirmation.
- **Action :** Ajouter un champ "Confirm password".

### UX-5: Error messages pas i18n `planned`

- **Probleme :** Les erreurs API sont en anglais ("Invalid credentials", "User already exists"). Pas de traduction cote client.
- **Action :** Mapper les codes d'erreur API vers des messages i18n.

### UX-6: Theme gacha-analyzer manquant `planned` (→ monorepo #72)

- **Probleme :** `app-themes.ts` ne definit pas de theme pour `gacha-analyzer`. L'app tombera sur le theme par defaut.
- **Action :** Ajouter le theme gacha-analyzer et asc-tcd.

### UX-7: Login/Register — pas de Suspense uniforme `planned`

- **Probleme :** Login utilise `<Spinner>` comme fallback, Register utilise `<Div>Loading...</Div>`. Incoherent.
- **Action :** Utiliser le meme pattern Suspense/Spinner partout.

---

## P4 — API Quality

### API-1: Response format inconsistant `planned`

- **Probleme :** Les routes auth (login, register, token) retournent le data directement via `sendSuccess()`, mais certaines routes waitlist ajoutent `success: true` manuellement dans le schema.
- **Action :** S'assurer que toutes les reponses passent uniquement par `sendSuccess()`/`sendError()` et que les schemas refletent le wrapper `{ success, data }`.

### API-2: OpenAPI registries manquantes pour OAuth `planned`

- **Probleme :** `oauthRegistries` est un array vide (`never[]`). Les routes Google OAuth n'ont pas de documentation OpenAPI.
- **Action :** Ajouter des registries pour `google-authorize` et `google-callback`.

### API-3: Waitlist routes dupliquees `planned`

- **Probleme :** Il y a 2 routes `GET /waitlist/:appName` — une dans `waitlist/get.ts` (publique) et une dans `admin/list-waitlist.ts` (admin avec auth). Elles sont montees sur des routers differents mais la publique expose les emails.
- **Action :** Supprimer la route publique ou la limiter aux stats (count seulement).

### API-4: Logout ne blacklist pas le token `planned`

- **Probleme :** `POST /auth/logout` clear le cookie mais ne blacklist pas le JWT. Si le token a ete copie, il reste valide 7 jours.
- **Lien :** FEAT-6/FEAT-7 (session management / refresh tokens).

### API-5: OAuth callback redirect_uri non-validee `planned`

- **Probleme :** Dans `google-callback.ts`, `user.redirect_uri` est utilise directement pour construire le redirect URL sans validation de whitelist.
- **Impact :** Open redirect potentiel apres OAuth.
- **Action :** Valider le redirect_uri contre une whitelist d'origins autorisees.

---

## Done

_(Rien pour l'instant)_

---

## Notes

- EZAuth est le service le plus critique — utilise par TOUTES les apps
- Le JWT auth fonctionne bien, le middleware est solide
- L'auth-sdk (httpOnly/localStorage adaptatif) est mature
- Le Google OAuth + token encryption (AES-256-GCM) est bien implemente
- CSRF protection est en place sur login-cookie
- Rate limiting en place sur login (5 req/min) et register (3 req/hour)
- Sentry integration est en place
- OpenAPI documentation est generee pour la plupart des routes
- Les tests existants (AuthUser, AuthCode) sont de bonne qualite
- Le RBAC system (globalRoles/appRoles/permissions/features) est bien concu mais les checks legacy ne l'utilisent pas encore
