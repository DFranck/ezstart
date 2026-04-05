# Backlog — EZAuth

**Status :** `maintained` | **Derniere mise a jour :** 2026-04-05

## ✅ Status: Maintained

All core features implemented and audited. Remaining items are future improvements.

### Done

- All P0 security fixes
- All P1 features (password reset, email verification, 2FA, sessions, refresh token rotation, admin endpoints)
- All P2 code quality fixes
- All P3 UX improvements
- All P4 API quality fixes

### Future (non-blocking)

- ~~RBAC-1: Complete role system simplification (remove legacy fields, replace inline checks, admin page, migrations)~~ `done`

## Objectif

SSO Authentication service pour le monorepo @ezstart (API + Web).

---

## Audit complet — 2026-03-29

### Resume executif

EZAuth est fonctionnel pour les flows principaux (login, register, Google OAuth, SSO code exchange, RBAC). La base est solide : Zod validation sur toutes les routes auth, rate limiting en place, OAuth token encryption (AES-256-GCM), CSRF sur login-cookie, bcrypt hashing, dual-mode httpOnly/localStorage. Les principales lacunes sont : fonctionnalites manquantes critiques (password reset, email verification, 2FA), hardcoded strings dans le web, admin role checks utilisant le legacy `roles` au lieu de `globalRoles`/`appRoles`, et app enum desynchronisee avec les apps reelles du monorepo.

---

## P0 — Securite critique

### SEC-4: `/me` endpoint sans middleware auth standard `done`

- **Probleme :** `/me` reimplemente manuellement l'extraction du token au lieu d'utiliser `verifyTokenMiddleware`. Code duplique avec le middleware.
- **Action :** Utiliser `verifyTokenMiddleware` et acceder a `req.user`.

### SEC-5: Crypto key derivation utilise JWT_SECRET `done`

- **Probleme :** `utils/crypto.ts` derive la cle AES de `JWT_SECRET`. Si JWT_SECRET leak, les tokens OAuth encrypts sont aussi compromis.
- **Action :** Utiliser une variable d'env separee `OAUTH_ENCRYPTION_KEY`.

### SEC-7: Waitlist GET endpoints publics sans auth `done`

- **Probleme :** `GET /waitlist/:appName` et `GET /waitlist/` (list all) sont publics et retournent toutes les emails.
- **Impact :** Leak de toutes les adresses email de la waitlist.
- **Action :** Ajouter `verifyTokenMiddleware` + admin check, ou limiter les infos retournees.

---

## P1 — Fonctionnalites manquantes

### FEAT-1: Password reset flow `done`

- **Quoi :** Forgot password -> email avec lien/code -> reset password.
- **Pourquoi :** Fonctionnalite basique attendue par tout service auth.
- **Etapes :**
  - [x] Endpoint `POST /auth/forgot-password` (envoie email)
  - [x] Endpoint `POST /auth/reset-password` (avec token)
  - [x] Model `PasswordResetToken` (ou reutiliser AuthCode)
  - [x] Page web `/forgot-password`
  - [x] Integration email service

### FEAT-2: Email verification `done`

- **Quoi :** Verifier l'email des users apres inscription.
- **Pourquoi :** `isVerified: true` est force a l'inscription ("for simplicity in v1"). Les users ne sont jamais verifies.
- **Etapes :**
  - [x] Endpoint `POST /auth/send-verification`
  - [x] Endpoint `POST /auth/verify-email` (avec token)
  - [x] `isVerified: false` par defaut a l'inscription
  - [x] Middleware pour bloquer les users non-verifies si necessaire
  - [x] Integration email service

### FEAT-4: 2FA (Two-Factor Authentication) `done`

- **Quoi :** TOTP (Google Authenticator) ou SMS.
- **Pourquoi :** Standard de securite pour un service auth SSO.
- **Etapes :**
  - [x] Model pour stocker les secrets TOTP
  - [x] Endpoints setup/verify/disable 2FA
  - [x] UI dans le profil user
  - [x] Integration dans le flow login

### FEAT-5: Account deletion (self-service) `done`

- **Quoi :** Permettre a un user de supprimer son compte.
- **Pourquoi :** Requis par GDPR. Actuellement aucun endpoint DELETE user.
- **Etapes :**
  - [x] Endpoint `DELETE /auth/account`
  - [x] Suppression cascade (OAuth accounts)
  - [x] UI de confirmation

### FEAT-6: Session management UI `done`

- **Quoi :** Dashboard des sessions actives + revocation.
- **Pourquoi :** Pas de moyen de voir ou invalider les sessions. Le JWT de 7 jours est stateless.
- **Options :** Token blacklist en Redis, ou refresh token rotation.

### FEAT-7: Refresh token rotation `done`

- **Quoi :** Remplacer le JWT 7 jours unique par access token court (15min) + refresh token (30 jours) avec rotation.
- **Pourquoi :** Meilleure securite. Actuellement un seul JWT de 7 jours sans possibilite de revocation.

### FEAT-8: Admin — delete user endpoint `done`

- **Quoi :** Endpoint `DELETE /admin/users/:id`.
- **Pourquoi :** Les admins peuvent lister, voir, et modifier les users mais pas les supprimer.

### FEAT-9: Admin — search/filter users `done`

- **Quoi :** Le schema `listUsersQuerySchema` definit `search` et `role` mais ils ne sont jamais utilises dans le query builder.
- **Action :** Implementer le filtrage par recherche (email/username) et par role.

### FEAT-10: Profile update endpoint `done`

- **Quoi :** Endpoint pour modifier son propre profil (firstName, lastName, avatar).
- **Pourquoi :** Aucun endpoint self-service pour modifier son profil.

### FEAT-11: Session current marker `done`

- [x] API: isCurrent flag via token hash comparison
- [x] Web: Badge "Session actuelle" + visual differentiation
- [x] Bouton Révoquer masqué sur session courante

### RBAC-1: Simplifier le systeme de roles `high` `architecture` — `done`

- **Probleme :** Le systeme de roles est disperse et incoherent :
  - `roles` (legacy) encore dans le code mais ne devrait plus exister
  - `globalRoles` pour superadmin/admin
  - `appRoles` pour les roles par app
  - `permissions` et `features` existent dans le modele mais jamais utilises
  - Chaque app fait ses propres checks inline au lieu d'utiliser un helper centralise
  - `isAdminUser()` dans EZPay verifie 5 conditions differentes
- **Solution proposee :**
  - [x] Definir la hierarchie : `superadmin > admin > app:admin > app:editor > app:viewer > user`
  - [x] Supprimer `roles` (legacy), `permissions`, `features` du modele AuthUser
  - [x] Creer `hasAccess(user, app, requiredRole)` helper dans auth-sdk (partage)
  - [x] Remplacer TOUS les checks inline dans les apps par `hasAccess()`
  - [x] Mettre a jour le JWT payload pour ne plus inclure les champs supprimes
  - [x] Page admin EZAuth pour gerer les roles visuellement (assign globalRoles + appRoles)
  - [x] Tests unitaires pour la hierarchie des roles
  - [x] Migration des users existants (script ready, data verified in DB)
- **Impact :** EZAuth API, auth-sdk, EZPay API, EZStart API, tous les middleware auth
- **Prerequis :** Aucun — peut etre fait independamment
- **Priorite :** High — doit etre fait avant le CRM/CMS car le panel admin a besoin d'un RBAC propre

---

## P2 — Qualite de code

### CODE-1: Hardcoded strings dans le web `done`

- **Probleme :** Les pages login et register contiennent des strings en dur non-i18n :
  - `login/page.tsx` : "Sign in to access", "One account, all EZStart apps!", "Don't have an account?", "Sign up", "Loading..."
  - `register/page.tsx` : "Create account to access", "One account, all EZStart apps!", "Already have an account?", "Sign in", "Loading..."
  - `page.tsx` (home) : "Redirecting to login...", "Loading..."
- **Action :** Utiliser `useTranslations()` partout.

### CODE-3: `as any` casts (4 occurrences) `done`

- **Fichiers :** `index.ts` (catch block), `auth.service.ts` (waitlist entry find), `AuthCode.test.ts` (model type), `express.d.ts` (index signature).
- **Action :** Typer correctement ou utiliser des narrowing patterns.

### CODE-5: Code duplique — appRoles Map-to-Object conversion `done`

- **Probleme :** La conversion `Map<string, string[]>` -> `Record<string, string[]>` est faite dans 5 endroits differents.
- **Action :** Extrait dans `utils/map-to-record.ts` — utilise partout (model, service, middleware, admin routes).

---

## P3 — UX Web

### UX-1: Pas de "Forgot password" link `done`

- **Probleme :** Le formulaire login n'a pas de lien "Mot de passe oublie".
- **Prerequis :** FEAT-1 (Password reset flow).

### UX-2: Register form — pas de validation en temps reel `done`

- **Probleme :** La validation email/username se fait uniquement au submit. Pas de verification d'unicite en temps reel.
- **Action :** Ajouter un endpoint `GET /auth/check-availability?email=...&username=...` et debounce dans le form.

### UX-3: Register form — password strength indicator `done`

- **Probleme :** Juste "Minimum 6 characters" comme hint. Pas d'indicateur de force.
- **Action :** Ajouter un composant password strength (from `@ezstart/ui`).

### UX-4: Register form — pas de confirm password `done`

- **Probleme :** Un seul champ password, pas de confirmation.
- **Action :** Ajouter un champ "Confirm password".

### UX-5: Error messages pas i18n `done`

- **Probleme :** Les erreurs API sont en anglais ("Invalid credentials", "User already exists"). Pas de traduction cote client.
- **Action :** Mapper les codes d'erreur API vers des messages i18n.

### UX-7: Login/Register — pas de Suspense uniforme `done`

- **Probleme :** Login utilise `<Spinner>` comme fallback, Register utilise `<Div>Loading...</Div>`. Incoherent.
- **Action :** Utiliser le meme pattern Suspense/Spinner partout.

---

## P4 — API Quality

### API-1: Response format inconsistant `done`

- **Probleme :** Les routes auth (login, register, token) retournent le data directement via `sendSuccess()`, mais certaines routes waitlist ajoutent `success: true` manuellement dans le schema.
- **Action :** S'assurer que toutes les reponses passent uniquement par `sendSuccess()`/`sendError()` et que les schemas refletent le wrapper `{ success, data }`.

### API-2: OpenAPI registries manquantes pour OAuth `done`

- **Probleme :** `oauthRegistries` est un array vide (`never[]`). Les routes Google OAuth n'ont pas de documentation OpenAPI.
- **Action :** Ajouter des registries pour `google-authorize` et `google-callback`.

### API-3: Waitlist routes dupliquees `done`

- **Probleme :** Il y a 2 routes `GET /waitlist/:appName` — une dans `waitlist/get.ts` (publique) et une dans `admin/list-waitlist.ts` (admin avec auth). Elles sont montees sur des routers differents mais la publique expose les emails.
- **Action :** Supprimer la route publique ou la limiter aux stats (count seulement).

### API-4: Logout ne blacklist pas le token `done`

- **Probleme :** `POST /auth/logout` clear le cookie mais ne blacklist pas le JWT. Si le token a ete copie, il reste valide 7 jours.
- **Lien :** FEAT-6/FEAT-7 (session management / refresh tokens).

### API-5: OAuth callback redirect_uri non-validee `done`

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
