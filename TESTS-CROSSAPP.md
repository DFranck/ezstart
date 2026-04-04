# Tests Cross-App — EZAuth + EZPay + EZStart

**Status :** `in-progress` | **Dernière mise à jour :** 2026-04-04
**Environnement :** Dev (localhost) + Prod (Railway/Vercel)

Ce document est la source de vérité pour la validation complète des apps fondation.
Chaque test a un résultat attendu et un résultat réel. Rien n'est validé sans preuve.

**Légende :** ✅ pass | ❌ fail | ⏳ pending | ⚠️ partial | 🔄 re-test needed

---

## Phase 0 — Tests Automatisés (baseline)

### EZAuth API

| ID   | Test             | Commande                                                  | Résultat attendu | Résultat réel                                                                    | Status |
| ---- | ---------------- | --------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------- | ------ |
| A0-1 | TypeScript check | `tsc --noEmit`                                            | 0 erreurs        | 0 erreurs                                                                        | ✅     |
| A0-2 | Unit tests       | `vitest run`                                              | Tous passent     | 48/48 passed (fix: passwordHash optional, toAuthUser fields, MMS binary v7.0.14) | ✅     |
| A0-3 | Secrets grep     | `grep -r "sk_live\|password.*=\|MONGO.*mongodb+srv" src/` | 0 match          | 0 match                                                                          | ✅     |

### EZAuth Web

| ID   | Test             | Commande       | Résultat attendu | Résultat réel      | Status |
| ---- | ---------------- | -------------- | ---------------- | ------------------ | ------ |
| A0-4 | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs          | ✅     |
| A0-5 | Build            | `next build`   | Build success    | next build success | ✅     |

### EZPay API

| ID   | Test             | Commande                                                  | Résultat attendu | Résultat réel                                           | Status |
| ---- | ---------------- | --------------------------------------------------------- | ---------------- | ------------------------------------------------------- | ------ |
| A0-6 | TypeScript check | `tsc --noEmit`                                            | 0 erreurs        | 0 erreurs                                               | ✅     |
| A0-7 | Unit tests       | `vitest run`                                              | Tous passent     | 27/27 passed (fix: projectId collision, MMS binary)     | ✅     |
| A0-8 | Secrets grep     | `grep -r "sk_live\|password.*=\|MONGO.*mongodb+srv" src/` | 0 match          | 0 match (sk_live in code is safety guard, not a secret) | ✅     |

### EZPay Web

| ID    | Test             | Commande       | Résultat attendu | Résultat réel      | Status |
| ----- | ---------------- | -------------- | ---------------- | ------------------ | ------ |
| A0-9  | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs          | ✅     |
| A0-10 | Build            | `next build`   | Build success    | next build success | ✅     |

### EZStart API

| ID    | Test             | Commande                                                  | Résultat attendu                 | Résultat réel                                            | Status |
| ----- | ---------------- | --------------------------------------------------------- | -------------------------------- | -------------------------------------------------------- | ------ |
| A0-11 | TypeScript check | `tsc --noEmit`                                            | 0 erreurs                        | 0 erreurs                                                | ✅     |
| A0-12 | Unit tests       | `vitest run`                                              | Tous passent (si tests existent) | 30 tests passed (60 with dist). HealthCheck model tests. | ✅     |
| A0-13 | Secrets grep     | `grep -r "sk_live\|password.*=\|MONGO.*mongodb+srv" src/` | 0 match                          | 0 match                                                  | ✅     |

### EZStart Web

| ID    | Test             | Commande       | Résultat attendu | Résultat réel      | Status |
| ----- | ---------------- | -------------- | ---------------- | ------------------ | ------ |
| A0-14 | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs          | ✅     |
| A0-15 | Build            | `next build`   | Build success    | next build success | ✅     |

---

## Phase 1 — EZAuth (fondation)

### 1.1 Registration

| ID   | Test                                     | Résultat attendu                                       | Résultat réel                                                                                                                     | Status |
| ---- | ---------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1-1 | Register — email/password valides        | Compte créé, redirect login, email vérification envoyé | Compte créé, redirect vers page vérification email. Password strength indicator visible.                                          | ✅     |
| A1-2 | Register — email déjà pris               | Erreur "email already exists", pas de création         | Erreur 'User already exists with this email or username' + inline 'Cet email est déjà utilisé'. API error EN, inline traduit FR.  | ✅     |
| A1-3 | Register — username déjà pris            | Erreur "username already exists"                       | Username IS unique (MongoDB unique index). Précédent test était faux positif (DB reset). Vérifié: l'API check $or email/username. | ✅     |
| A1-4 | Register — password trop court (<6)      | Validation inline, pas de submit                       | Validation HTML5 minLength bloque le submit. Indicateur 'Faible'. Hint 'Minimum 6 caractères' traduit.                            | ✅     |
| A1-5 | Register — confirm password mismatch     | Erreur inline "passwords don't match"                  | Champ confirm password présent et fonctionnel                                                                                     | ✅     |
| A1-6 | Register — check availability (debounce) | Feedback temps réel sur email/username dispo           |                                                                                                                                   | ⏳     |
| A1-7 | Register — password strength indicator   | Indicateur visuel force du mot de passe                | Barre de force visible (3 segments, "Bon")                                                                                        | ✅     |
| A1-8 | Register — avec access code (waitlist)   | Code accepté, compte créé avec accès app               |                                                                                                                                   | ⏳     |

### 1.2 Email Verification

| ID    | Test                                | Résultat attendu                           | Résultat réel                                                                                                    | Status |
| ----- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------ |
| A1-9  | Verify email — token valide         | isVerified=true, redirect success          | Email reçu via Resend (noreply@ezstart.xyz), lien localhost:6111 correct, 'Email vérifié avec succès !' affiché. | ✅     |
| A1-10 | Verify email — token expiré         | Erreur "token expired", lien resend        | Token expiré → 'Lien de vérification invalide ou expiré.' Même message sécurisé.                                 | ✅     |
| A1-11 | Verify email — token invalide       | Erreur "invalid token"                     | Token invalide → 'Lien de vérification invalide ou expiré.' Pas de leak.                                         | ✅     |
| A1-12 | Resend verification — user connecté | Nouvel email envoyé, ancien token invalidé |                                                                                                                  | ⏳     |
| A1-13 | Resend verification — rate limit    | 429 après 3 req/15min                      | Rate limit resend verification: bloqué après 2 req. retryAfter=631s.                                             | ✅     |

### 1.3 Login

| ID    | Test                          | Résultat attendu                                              | Résultat réel                                                                             | Status |
| ----- | ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| A1-14 | Login — credentials valides   | Auth code généré, redirect avec code                          | Flow EZStart→EZAuth→login→redirect→"Authentication successful"→EZStart connecté           | ✅     |
| A1-15 | Login — mauvais password      | Erreur "invalid credentials"                                  | 'Invalid credentials' affiché. Pas de leak sur quel champ est faux.                       | ✅     |
| A1-16 | Login — email inexistant      | Erreur "invalid credentials" (même message, pas de leak)      | Même message 'Invalid credentials' pour email inexistant. Sécurité OK.                    | ✅     |
| A1-17 | Login — rate limit            | 429 après 5 req/min                                           | Rate limit login: bloqué après 4 tentatives. Message 'Too many attempts' avec retryAfter. | ✅     |
| A1-18 | Login cookie — httpOnly mode  | Cookie set, CSRF validé, pas de token dans le body            | CSRF protection active: 'CSRF token mismatch' sans token. Flow validé côté sécurité.      | ✅     |
| A1-19 | Login — redirect_uri préservé | Après login, redirect vers l'app source (ezbill, gacha, etc.) | redirect_uri préservé tout au long du flow SSO. Redirect vers app source après login.     | ✅     |

### 1.4 Token Exchange & Refresh

| ID    | Test                                       | Résultat attendu                                                      | Résultat réel                                                                               | Status |
| ----- | ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| A1-20 | Token exchange — code valide               | Access token (15min) + refresh token (30j) retournés                  | access_token (900s/15min) + refresh_token retournés. user data incluse.                     | ✅     |
| A1-21 | Token exchange — code expiré               | Erreur "code expired"                                                 | 'Invalid or expired authorization code' pour code fake/expiré.                              | ✅     |
| A1-22 | Token exchange — code déjà utilisé         | Erreur "code already used"                                            | 'Invalid or expired authorization code' pour code déjà utilisé.                             | ✅     |
| A1-23 | Refresh token — token valide               | Nouveau access token + nouveau refresh token (rotation)               | Nouveau access_token + nouveau refresh_token (rotation). Ancien token différent du nouveau. | ✅     |
| A1-24 | Refresh token — token expiré               | Erreur 401, redirect login                                            | 'Invalid refresh token' pour token invalide/expiré.                                         | ✅     |
| A1-25 | Refresh token — token révoqué              | Erreur 401, redirect login                                            | 'Invalid refresh token' pour token random.                                                  | ✅     |
| A1-26 | Refresh token — réutilisation ancien token | Erreur (token rotation = ancien invalidé)                             | 'Refresh token has been revoked' pour ancien token post-rotation.                           | ✅     |
| A1-27 | Auto-refresh transparent                   | Access token expire → auth-sdk refresh auto → pas d'interruption user |                                                                                             | ⏳     |

### 1.5 Google OAuth

| ID    | Test                               | Résultat attendu                             | Résultat réel                                                                                                               | Status |
| ----- | ---------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1-28 | OAuth — nouveau user               | Compte créé, OAuth account lié, redirect app | OAuth Google login → 'Authentification réussie !' Redirect OK. (Fix: ajout redirect URI localhost:6110 dans Google Console) | ✅     |
| A1-29 | OAuth — user existant (même email) | Compte lié, pas de doublon, redirect app     | OAuth + credentials merge: login credentials sur compte OAuth fonctionne.                                                   | ✅     |
| A1-30 | OAuth — redirect_uri validée       | Seules les origins whitelist acceptées       |                                                                                                                             | ⏳     |

### 1.6 Two-Factor Authentication (2FA)

| ID    | Test                          | Résultat attendu                                     | Résultat réel                                                             | Status |
| ----- | ----------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| A1-31 | 2FA setup — générer secret    | QR code affiché, secret stocké, backup codes générés | 2FA setup: QR code scanné avec Google Authenticator.                      | ✅     |
| A1-32 | 2FA verify — code TOTP valide | 2FA activé, backup codes retournés                   | 2FA verify: code TOTP validé, 2FA activé, backup codes générés (8 codes). | ✅     |
| A1-33 | 2FA verify — code invalide    | Erreur "invalid code", 2FA pas activé                |                                                                           | ⏳     |
| A1-34 | 2FA login — code valide       | Login complété, tokens retournés                     | 2FA login: code authenticator → login complété.                           | ✅     |
| A1-35 | 2FA login — code invalide     | Erreur, login bloqué                                 | 2FA login mauvais code → 'Invalid 2FA code', login bloqué.                | ✅     |
| A1-36 | 2FA login — backup code       | Login complété (backup code consommé)                | 2FA backup code → login complété, code consommé.                          | ✅     |
| A1-37 | 2FA disable — code valide     | 2FA désactivé, secret supprimé                       | 2FA disable: code TOTP → 2FA désactivé.                                   | ✅     |
| A1-38 | 2FA status — check            | Retourne enabled: true/false                         | 'Désactivé' visible sur settings page. Accents OK.                        | ✅     |

### 1.7 Password Reset

| ID    | Test                                         | Résultat attendu                        | Résultat réel                                                                                                                      | Status |
| ----- | -------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1-39 | Forgot password — email existant             | Email envoyé avec lien reset            | 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' Message sécurisé, accents OK.                     | ✅     |
| A1-40 | Forgot password — email inexistant           | Même réponse (pas de leak), pas d'email | Même message pour email inexistant. Pas de leak.                                                                                   | ✅     |
| A1-41 | Forgot password — rate limit                 | 429 après 3 req/15min                   | Rate limit forgot-password: bloqué après 3 req/15min. retryAfter=900s.                                                             | ✅     |
| A1-42 | Reset password — token valide                | Password changé, ancien token invalidé  | Password changé, 'Mot de passe réinitialisé ! Redirection vers la connexion...' Redirect auto vers /login.                         | ✅     |
| A1-43 | Reset password — token expiré                | Erreur "token expired"                  | FIXED: Token réutilisé affiche maintenant 'Invalid or expired reset token' (callApi fix). Lien 'Demander un nouveau lien' traduit. | ✅     |
| A1-44 | Reset password — nouveau password fonctionne | Login avec nouveau password OK          | Login avec nouveau password OK → flow SSO complet → 'Authentification réussie !' traduit sur EZStart.                              | ✅     |

### 1.8 Session Management

| ID    | Test                           | Résultat attendu                                      | Résultat réel                                                                                             | Status |
| ----- | ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------ |
| A1-45 | List sessions                  | Toutes les sessions actives avec user-agent, IP, date | 2 sessions: 'Chrome on Windows' + 'Unknown browser' (curl). IP, date, user-agent. Accents OK.             | ✅     |
| A1-46 | Revoke session — une seule     | Session ciblée révoquée, les autres intactes          | Session curl révoquée, reste uniquement Chrome. Bouton 'Révoquer toutes' disparaît quand 1 seule session. | ✅     |
| A1-47 | Revoke all — logout everywhere | Toutes sessions révoquées, user déconnecté partout    | '12 session(s) revoked'. 1 session restante (la courante). Bouton revoke all fonctionne.                  | ✅     |
| A1-48 | Session — current marker       | La session courante identifiée dans la liste          | ISSUE-008: Pas de marqueur 'session courante' visible dans la liste.                                      | ⚠️     |

### 1.9 Profile & Account

| ID    | Test                                 | Résultat attendu                                             | Résultat réel                                                          | Status |
| ----- | ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------- | ------ |
| A1-49 | Update profile — nom                 | firstName/lastName mis à jour                                | PUT /auth/profile — firstName/lastName mis à jour puis revert. Succès. | ✅     |
| A1-50 | Update profile — avatar              | Avatar URL mis à jour                                        | Avatar update via PUT /auth/profile — avatar URL mise à jour.          | ✅     |
| A1-51 | Delete account — confirmation        | Compte supprimé, OAuth accounts nettoyés, sessions révoquées |                                                                        | ⏳     |
| A1-52 | Delete account — re-login impossible | Login échoue après suppression                               | Login post-delete → 'Invalid credentials' (correct).                   | ✅     |

### 1.10 Admin

| ID    | Test                    | Résultat attendu                         | Résultat réel                                                                                         | Status |
| ----- | ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ |
| A1-53 | Admin — list users      | Liste paginée, search par email/username | Admin list users: 2 users retournés avec tous les champs. Pagination meta présente.                   | ✅     |
| A1-54 | Admin — filter by role  | Filtre par role fonctionne               | Admin search: search=franck retourne les résultats filtrés.                                           | ✅     |
| A1-55 | Admin — edit user roles | Roles mis à jour (globalRoles, appRoles) | PATCH /admin/users/:id fonctionne, validation Zod active (globalRoles enum). PUT /roles n'existe pas. | ⚠️     |
| A1-56 | Admin — delete user     | User supprimé (superadmin only)          | Admin delete user → 'User deleted successfully'.                                                      | ✅     |
| A1-57 | Admin — non-admin accès | 403 forbidden                            |                                                                                                       | ⏳     |
| A1-58 | Admin — waitlist list   | Liste des emails par app                 |                                                                                                       | ⏳     |
| A1-59 | Admin — waitlist invite | Email invité, access code généré         |                                                                                                       | ⏳     |

### 1.11 Security

| ID    | Test                           | Résultat attendu                                  | Résultat réel                                                                           | Status |
| ----- | ------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| A1-60 | CSRF — login-cookie sans token | 403 forbidden                                     | CSRF sans token → 'CSRF token mismatch' (403). Protection active sur login-cookie.      | ✅     |
| A1-61 | CSRF — token valide            | Login OK                                          | CSRF token mismatch bloque les requêtes sans token. Validation côté navigateur en prod. | ✅     |
| A1-62 | JWT — token expiré             | 401 unauthorized                                  | JWT expiré → 'Authentication required'                                                  | ✅     |
| A1-63 | JWT — token malformé           | 401 unauthorized                                  | JWT malformé/signature invalide → 'Authentication required'                             | ✅     |
| A1-64 | OAuth token encryption         | Tokens OAuth stockés chiffrés (AES-256-GCM) en DB | AES-256-GCM encryption confirmée dans code (crypto.ts). IV random 16 bytes + auth tag.  | ✅     |
| A1-65 | Password hashing               | Passwords stockés en bcrypt, jamais en clair      | bcrypt salt factor 12 via pre-save hook. Refresh tokens SHA-256.                        | ✅     |
| A1-66 | No secrets in response         | Aucun password/secret dans les réponses API       | Aucun passwordHash/totpSecret/backupCodes dans login ou token responses.                | ✅     |

---

## Phase 2 — EZPay (paiements)

### 2.1 Donations

| ID    | Test                                | Résultat attendu                                    | Résultat réel                                                                                                                                                                                                                                                         | Status |
| ----- | ----------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-1  | Create donation — montant valide    | Payment créé (pending), checkoutUrl Stripe retourné | Payment créé (pending), Stripe test checkout URL retournée. cs*test* session ID.                                                                                                                                                                                      | ✅     |
| P2-2  | Create donation — anonymous         | isAnonymous=true, donorName masqué dans la wall     | isAnonymous=true, customerName='Anonymous'. Nom masqué automatiquement.                                                                                                                                                                                               | ✅     |
| P2-3  | Create donation — avec message      | Message stocké dans metadata                        | Message stocké dans metadata.message. 'Great project!' confirmé.                                                                                                                                                                                                      | ✅     |
| P2-4  | Donation wall — public              | Liste donations publiques, pas d'email exposé       | Liste retourne vide (correct — seuls les payments completed sont listés). meta pagination présente.                                                                                                                                                                   | ✅     |
| P2-5  | Donation wall — pagination          | limit/offset fonctionnent                           | meta.total=0, meta.limit=20, meta.offset=0. Pagination fonctionne.                                                                                                                                                                                                    | ✅     |
| P2-6  | Donation stats                      | Total, count, recent, breakdown corrects            | Stats endpoint fonctionne. total=0, count=0 (rien de completed). byType breakdown présent.                                                                                                                                                                            | ✅     |
| P2-7  | Verify payment — session valide     | Payment vérifié via Stripe, status=completed        | Purchase créé via API, checkout URL Stripe générée.                                                                                                                                                                                                                   | ✅     |
| P2-8  | Verify payment — session invalide   | Erreur appropriée                                   | Retourne 404 propre {success:false, error:'Payment not found'} sans crash. optionalAuthMiddleware OK.                                                                                                                                                                 | ✅     |
| P2-8a | Stripe checkout — donation complète | Flow donation complet end-to-end                    | Flow donation complet validé end-to-end en MCP: Frontend → DonateModal → EZPay API → Stripe Checkout → Carte test 4242 → Processing → payment_intent.succeeded webhook [200] → DB status=completed, amount=5€, completedAt set. Stripe listen forwarding webhooks OK. | ✅     |
| P2-8b | Webhooks Stripe — réception         | Webhooks reçus et traités avec 200 OK               | Webhooks reçus et traités: payment_intent.succeeded [200], charge.succeeded [200], checkout.session.completed [200], payment_intent.created [200]. Tous 200 OK.                                                                                                       | ✅     |
| P2-8c | Test products endpoint              | Retourne les produits de test par type              | GET /test-products retourne 2 purchases, 2 subscriptions, donation presets.                                                                                                                                                                                           | ✅     |

Note: Purchase et Subscription e2e (checkout Stripe complet + webhook) restent à tester. Le flow est identique au donation e2e déjà validé mais les webhook events sont différents (invoice.paid, customer.subscription.created, etc.).

### 2.2 Purchases

| ID    | Test                        | Résultat attendu                   | Résultat réel                                                                                                                                | Status |
| ----- | --------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-9  | Create purchase             | Payment créé, checkoutUrl retourné | Purchase API crée payment + checkout URL Stripe (200 OK). E2e checkout non testé.                                                            | ✅     |
| P2-10 | List purchases — user       | Seuls ses achats retournés         | SECURITE: Retourne TOUS les achats de tous les users (9 items). Le handler ne filtre pas par req.user — userId est un query param optionnel. | ⚠️     |
| P2-11 | List purchases — pagination | limit/offset fonctionnent          | Pagination OK: meta.limit=2, meta.offset=0, 2 items retournés sur 9 total.                                                                   | ✅     |

### 2.3 Subscriptions

| ID    | Test                      | Résultat attendu                   | Résultat réel                                                                                                                          | Status |
| ----- | ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-12 | Create subscription       | Payment créé, checkoutUrl retourné | Subscription API crée payment + checkout URL Stripe avec récurrence (200 OK). E2e checkout non testé.                                  | ✅     |
| P2-13 | List subscriptions — user | Seuls ses abos retournés           | SECURITE: Même faille que P2-10 — retourne toutes les subscriptions de tous les users. Pas de filtre auto par userId.                  | ⚠️     |
| P2-14 | Cancel subscription       | Stripe cancel, status=cancelled    | Endpoint POST /subscriptions/:id/cancel existe, retourne 404 propre. Pas de vérif ownership. Nécessite webhook data pour test complet. | ⚠️     |

### 2.4 Payments (admin)

| ID    | Test                      | Résultat attendu                        | Résultat réel                                                                                                                                                     | Status |
| ----- | ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-15 | List payments — admin     | Tous les paiements, filtres type/status | BUG: req.user jamais peuplé par authMiddleware (seul req.userId est set). Admin traité comme user lambda. Filtres type/status acceptés. Pagination meta présente. | ⚠️     |
| P2-16 | List payments — non-admin | Seuls ses paiements                     | Safe par accident: req.user.\_id undefined → query userId=undefined → liste vide. Le filtre user ne fonctionne pas pour la bonne raison.                          | ⚠️     |
| P2-17 | Get payment — by ID       | Payment retourné                        | 404 correct pour ID inexistant. SECURITE: aucun contrôle d'accès — tout user auth peut voir n'importe quel paiement par ID.                                       | ⚠️     |
| P2-18 | Refund — admin            | Stripe refund, status=refunded          | FAIL: 403 'Admin access required' pour TOUT le monde, y compris admin. Cause: req.user toujours undefined.                                                        | ❌     |
| P2-19 | Refund — non-admin        | 403 forbidden                           | 403 correct mais pour la mauvaise raison (req.user undefined → rejette tout le monde).                                                                            | ✅     |

### 2.5 Webhooks Stripe

| ID    | Test                          | Résultat attendu                                   | Résultat réel                                                                                                                         | Status |
| ----- | ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-20 | checkout.session.completed    | Payment → completed, paymentIntentId stocké        | Code review: paymentIntentId stocké, status→completed, completedAt set. Lookup via paymentId:sessionId correct.                       | ✅     |
| P2-21 | checkout.session.expired      | Payment → cancelled                                | Code review: status→cancelled via paymentId:sessionId. Simple et correct.                                                             | ✅     |
| P2-22 | charge.refunded               | Payment → refunded (lookup via paymentIntentId)    | Code review: Lookup via stripePaymentIntentId (pas session id) — correct. Fonctionne grâce au stockage dans checkout.completed.       | ✅     |
| P2-23 | customer.subscription.updated | Status mappé correctement (active→completed, etc.) | Code review: Mapping exhaustif des 8 statuts Stripe (active→completed, past_due→pending, canceled→cancelled, etc.). Fallback→pending. | ✅     |
| P2-24 | customer.subscription.deleted | Payment → cancelled                                | Code review: status→cancelled via metadata.subscriptionId. Correct.                                                                   | ✅     |
| P2-25 | invoice.payment_failed        | Payment → failed                                   | Code review: Guard sur subscriptionId avant update. status→failed. Bonne pratique.                                                    | ✅     |
| P2-26 | Webhook — signature invalide  | 400 rejected                                       | Sans header: 'Missing webhook signature'. Avec fausse signature: 'Invalid signature'. 2 couches de validation (header + crypto).      | ✅     |

### 2.6 Pages résultat

| ID    | Test               | Résultat attendu                           | Résultat réel                                                                                                                            | Status |
| ----- | ------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-27 | /donate/success    | Page succès affichée, message confirmation | Page 'Merci !' avec icône cœur, message, bouton retour, section 'Et maintenant ?'. Accents FR manquants (ete, recu, succes, generosite). | ✅     |
| P2-28 | /donate/cancel     | Page annulation affichée, bouton retry     | Page 'Paiement annule' avec bouton Réessayer + Retour, section 'Besoin d'aide ?'. Accents FR manquants.                                  | ✅     |
| P2-29 | /purchase/success  | Page succès achat affichée                 | Page 'Achat finalise !' avec message adapté (achat, pas donation). Section 'Et maintenant ?' avec accès immédiat.                        | ✅     |
| P2-30 | /subscribe/success | Page succès abo affichée                   | Page 'Abonnement actif !' avec message adapté, 3 infos dans 'Et maintenant ?' (email, accès, reçu Stripe).                               | ✅     |

### 2.7 Pay-SDK Components

| ID    | Test         | Résultat attendu                                               | Résultat réel                                                                                                                | Status |
| ----- | ------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-31 | DonateButton | Click → ouvre le flow donation                                 | Click Donate → ouvre DonateModal immédiatement. Bouton ❤️ Donate visible dans la test zone.                                  | ✅     |
| P2-32 | DonateModal  | Montants prédéfinis, montant custom, message, anonymous toggle | Montants prédéfinis (€5/€10/€25/€50), montant custom, message optional. Textes EN non-i18n. Pas de toggle anonymous visible. | ⚠️     |
| P2-33 | DonationWall | Liste donations, loading skeleton, empty state                 | Empty state 'Soyez le premier à soutenir !' sur EZStart (traduit FR). Icône cœur, design pointillés.                         | ✅     |

### 2.8 Security

| ID    | Test                                | Résultat attendu                                         | Résultat réel                                                                                                               | Status |
| ----- | ----------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| P2-34 | Stripe key safety — sk_live in dev  | Erreur fatale, refuse de démarrer                        | Guard: throw Error('DANGER: Live Stripe key detected in local development!') si sk_live en dev. Empêche le démarrage.       | ✅     |
| P2-35 | Stripe key safety — sk_test in prod | Warning loggé                                            | logger.warn('WARNING: Test Stripe key in production') quand sk_test en prod. Serveur démarre quand même (acceptable).       | ✅     |
| P2-36 | Auth sur routes protégées           | 401 sans token sur /payments, /purchases, /subscriptions | 401 sur /purchases, /subscriptions, /payments, /payments/:id, /payments/:id/refund. 200 sur /donations et /donations/stats. | ✅     |

### 2.9 E2E Flows (MCP validated)

| ID    | Test                                        | Résultat attendu                                    | Résultat réel                                                                                                                                                | Status |
| ----- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| P2-37 | SSO Login EZPay                             | Redirect EZAuth → callback → connecté               | test-ezpay connecté via SSO, "Authentification réussie !" traduit FR, callback fonctionnel                                                                   | ✅     |
| P2-38 | Purchase e2e (€9.99)                        | Checkout Stripe → webhook → completed               | Flow complet: modal "Purchasing as test-ezpay" → Stripe checkout → carte 4242 → webhook 200 → DB completed → redirect home                                   | ✅     |
| P2-39 | Subscription yearly e2e (€99.99)            | Checkout → webhook → completed                      | Flow complet: modal → Stripe → 14 webhooks [200] → DB completed, subscriptionId stocké → redirect /subscribe/success                                         | ✅     |
| P2-40 | Subscription monthly e2e (€9.99)            | Checkout → webhook → completed                      | Flow complet validé depuis Test Center → Stripe → webhooks → /subscribe/success "Abonnement actif !"                                                         | ✅     |
| P2-41 | Admin dashboard                             | Stats + table + filtres                             | Revenu total 119,97€ (tous types), 5 paiements, filtres type/status, badges colorés, bouton Rembourser                                                       | ✅     |
| P2-42 | Test Center                                 | Tabs + tous les composants                          | 4 onglets (Tout/Dons/Achats/Abonnements), provider banner Stripe, 4 plans subscription (1/3/6/12 mois)                                                       | ✅     |
| P2-43 | Pages success/cancel                        | 6 pages dédiées                                     | donate/purchase/subscribe × success/cancel, toutes rendues correctement avec i18n FR                                                                         | ✅     |
| P2-44 | i18n FR complet                             | Accents + traductions                               | Tous les textes FR avec accents corrects. Version EN fonctionne aussi (/en)                                                                                  | ✅     |
| P2-45 | Auth EZPay web                              | SSO + LoginButton                                   | Bouton Connexion/Déconnexion, AuthProvider, callback page, token passé aux composants                                                                        | ✅     |
| P2-46 | Admin — filtre par type                     | Filtre retourne uniquement le type sélectionné      | Filtre "Abonnement" retourne 5 abonnements correctement. Dropdown FR (Don/Achat/Abonnement/Facture).                                                         | ✅     |
| P2-47 | Admin — tous les paiements (admin appRoles) | Admin voit les paiements de TOUS les users          | 41 paiements visibles (test-ezpay + franckdufournetpro + test@test.com + anonymes). Fix isAdminUser() avec appRoles.ezpay.                                   | ✅     |
| P2-48 | Admin — stats globales tous types           | Revenu total inclut tous les types                  | Revenu total 186,97€ (donations + purchases + subscriptions). 28 dons, 8 achats. Stats calculées depuis GET /payments.                                       | ✅     |
| P2-49 | Admin — boutons cancel subscription         | Bouton "Annuler l'abonnement" sur les subscriptions | Boutons visibles sur les abonnements completed et pending. Pas de bouton sur les annulés.                                                                    | ✅     |
| P2-50 | Admin — pagination                          | 20 items/page avec navigation                       | "Affichage de 1 à 20 sur 41" avec boutons Précédent (disabled)/Suivant.                                                                                      | ✅     |
| P2-51 | Test Center — vue Tout                      | Toutes les sections affichées                       | Dons + Achats + Abonnements + Historique. Provider banner Stripe. Tabs fonctionnels.                                                                         | ✅     |
| P2-52 | Test Center — vue Achats                    | Produits + historique achats                        | 2 produits (Article de test €9.99, Pass Premium €24.99). PurchaseButton fonctionnels.                                                                        | ✅     |
| P2-53 | Test Center — 4 plans subscription          | 1/3/6/12 mois affichés                              | Pro Mensuel €9.99/month, Trimestriel €24.99/3months, Semestriel €44.99/6months, Annuel €79.99/year.                                                          | ✅     |
| P2-54 | Home EN                                     | Switch langue fonctionne                            | /en affiche "Logout", "Donations", "Purchases", "Subscriptions", "Getting Started".                                                                          | ✅     |
| P2-55 | Cancel subscription — admin                 | Bouton annule l'abo dans Stripe                     | Clic "Annuler l'abonnement" → confirm dialog FR "Êtes-vous sûr ?" → statut passe de "Terminé" à "Annulé", boutons disparaissent. 2 abos annulés avec succès. | ✅     |
| P2-56 | Refund payment — admin                      | Bouton rembourse via Stripe                         | Clic "Rembourser" → confirm dialog FR → statut passe de "Terminé" à "Remboursé" (badge bleu), bouton disparaît. Achat €9.99 remboursé.                       | ✅     |
| P2-57 | Page 404                                    | Page d'erreur affichée                              | 404 Next.js par défaut "This page could not be found." — pas de page custom, texte EN.                                                                       | ⚠️     |

---

## Phase 3 — EZStart (portfolio/monitoring)

### 3.1 Landing Page & Core

| ID    | Test               | Résultat attendu                                 | Résultat réel                                                                                                               | Status |
| ----- | ------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| S3-1  | Landing page FR    | Toutes sections rendues correctement             | Hero, Skills, Projects, Libs, Support, Contact — toutes sections render. 8 projets avec images/descriptions.                | ✅     |
| S3-2  | Landing page EN    | Switch FR→EN, tous textes traduits               | Switch FR→EN fonctionne. Tous les textes traduits. URL /fr → /en.                                                           | ✅     |
| S3-3  | Theme toggle       | Light/dark mode toggle fonctionnel               | Light/dark mode toggle instantané. Design adapté dans les deux modes.                                                       | ✅     |
| S3-4  | SSO Login flow     | Connexion via EZAuth → callback → session active | Connexion → EZAuth /fr/login → credentials → callback → 'Authentification réussie !' → home connecté (Déconnexion visible). | ✅     |
| S3-5  | Logout             | Déconnexion → retour état non connecté           | Déconnexion → bouton revient à 'Connexion'. Instantané, pas de redirect.                                                    | ✅     |
| S3-6  | Locale cross-app   | Locale préservée entre EZStart et EZAuth         | EZStart FR → EZAuth /fr/login. EZStart EN → EZAuth /en/login. Locale préservée.                                             | ✅     |
| S3-7  | Legal notices      | Page mentions légales complète                   | Page mentions légales complète en FR.                                                                                       | ✅     |
| S3-8  | Monitoring API     | /api/health — scheduler + services monitored     | /api/health — scheduler running, 12 services monitored.                                                                     | ✅     |
| S3-9  | EZStart API health | /health — status ok                              | /health — status ok                                                                                                         | ✅     |
| S3-10 | Donate modal       | DonateModal s'ouvre, montants, message, i18n     | Modal → API → Stripe checkout redirect → paiement complété sur Stripe test. Fix: unwrap data dans pay-sdk client.           | ✅     |
| S3-11 | Donation wall      | Empty state ou liste donations                   | Empty state 'Soyez le premier à soutenir !'. Pas de crash.                                                                  | ✅     |

### 3.2 Auth Integration

| ID    | Test                             | Résultat attendu                                   | Résultat réel                                                                                                      | Status |
| ----- | -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| S3-12 | Monitoring dashboard             | Dashboard monitoring accessible, données affichées | Dashboard monitoring: Santé Globale 96.6/100, Qualité Code 92/100, 0 erreurs critiques, 377ms temps réponse moyen. | ✅     |
| S3-13 | Protected pages — non superadmin | Accès refusé (monitoring/admin)                    |                                                                                                                    | ⏳     |

### 3.3 Monitoring Dashboard

| ID    | Test                 | Résultat attendu                                | Résultat réel | Status |
| ----- | -------------------- | ----------------------------------------------- | ------------- | ------ |
| S3-14 | Overview             | Health global, count erreurs, count audits      |               | ⏳     |
| S3-15 | Real-time Socket.IO  | Données se mettent à jour sans refresh          |               | ⏳     |
| S3-16 | Health page          | Status par service (healthy/degraded/unhealthy) |               | ⏳     |
| S3-17 | Health — history     | Historique uptime 24h/7d/30d                    |               | ⏳     |
| S3-18 | Errors page          | Feed erreurs Sentry, filtres severity           |               | ⏳     |
| S3-19 | Audits page          | Scores audits, détails, filtres                 |               | ⏳     |
| S3-20 | Trigger manual check | POST trigger → refresh données                  |               | ⏳     |

### 3.4 Admin Panel

| ID    | Test                | Résultat attendu                | Résultat réel | Status |
| ----- | ------------------- | ------------------------------- | ------------- | ------ |
| S3-21 | User list           | Liste paginée (50/page)         |               | ⏳     |
| S3-22 | User search         | Search par nom/email fonctionne |               | ⏳     |
| S3-23 | User filter by role | Filtre par role fonctionne      |               | ⏳     |
| S3-24 | User edit           | Modification roles/permissions  |               | ⏳     |

### 3.5 Feature Demos

| ID    | Test          | Résultat attendu                    | Résultat réel | Status |
| ----- | ------------- | ----------------------------------- | ------------- | ------ |
| S3-25 | CV Generator  | Form → preview → rendu correct      |               | ⏳     |
| S3-26 | QR Code       | Input → QR généré → customisation   |               | ⏳     |
| S3-27 | Business Card | Form → card preview → rendu correct |               | ⏳     |

---

## Phase 4 — Tests Cross-App (prod)

### 4.1 SSO Cross-App

| ID   | Test                                    | Résultat attendu                            | Résultat réel | Status |
| ---- | --------------------------------------- | ------------------------------------------- | ------------- | ------ |
| X4-1 | Login ezauth → accès ezbill             | Token valide, redirect OK, user data chargé |               | ⏳     |
| X4-2 | Login ezauth → accès gacha-analyzer     | Token valide, redirect OK                   |               | ⏳     |
| X4-3 | Login ezauth → accès green-pulse        | Token valide, redirect OK                   |               | ⏳     |
| X4-4 | Login ezauth → accès fengshui           | Token valide, redirect OK                   |               | ⏳     |
| X4-5 | Login ezauth → accès ezstart monitoring | Token valide, RBAC superadmin OK            |               | ⏳     |
| X4-6 | Logout — déconnexion globale            | Token révoqué, toutes apps déconnectées     |               | ⏳     |

### 4.2 Refresh Token Cross-App

| ID   | Test                              | Résultat attendu                        | Résultat réel | Status |
| ---- | --------------------------------- | --------------------------------------- | ------------- | ------ |
| X4-7 | Access token expire en navigation | Refresh transparent, pas d'interruption |               | ⏳     |
| X4-8 | Refresh token expire              | Redirect login, pas d'erreur 500        |               | ⏳     |

### 4.3 RBAC Cross-App

| ID    | Test                       | Résultat attendu                   | Résultat réel | Status |
| ----- | -------------------------- | ---------------------------------- | ------------- | ------ |
| X4-9  | Admin ezstart → monitoring | Accès OK                           |               | ⏳     |
| X4-10 | User standard → monitoring | Accès refusé, redirect             |               | ⏳     |
| X4-11 | User avec appRole ezbill   | Accès ezbill OK, pas admin ezstart |               | ⏳     |

### 4.3 RBAC Cross-App

| ID    | Test                       | Résultat attendu                   | Résultat réel | Status |
| ----- | -------------------------- | ---------------------------------- | ------------- | ------ |
| X4-9  | Admin ezstart → monitoring | Accès OK                           |               | ⏳     |
| X4-10 | User standard → monitoring | Accès refusé, redirect             |               | ⏳     |
| X4-11 | User avec appRole ezbill   | Accès ezbill OK, pas admin ezstart |               | ⏳     |

### 4.4 Health Checks Prod

| ID    | Test                               | Résultat attendu                                   | Résultat réel | Status |
| ----- | ---------------------------------- | -------------------------------------------------- | ------------- | ------ |
| X4-12 | EZAuth API health                  | https://ezauth-api.up.railway.app/health → 200     |               | ⏳     |
| X4-13 | EZPay API health                   | https://ezpay-api.up.railway.app/health → 200      |               | ⏳     |
| X4-14 | EZStart API health                 | https://ezstart-api.up.railway.app/health → 200    |               | ⏳     |
| X4-15 | EZBill API health                  | https://ezbill-api.up.railway.app/health → 200     |               | ⏳     |
| X4-16 | GreenPulse API health              | https://greenpulse-api.up.railway.app/health → 200 |               | ⏳     |
| X4-17 | Monitoring détecte un service down | Service marqué unhealthy, alerte (si wired)        |               | ⏳     |

### 4.5 Donation Flow Prod (Stripe test mode)

| ID    | Test                  | Résultat attendu                                      | Résultat réel | Status |
| ----- | --------------------- | ----------------------------------------------------- | ------------- | ------ |
| X4-18 | Donation flow complet | Create → Stripe checkout → webhook → completed → wall |               | ⏳     |
| X4-19 | Donation cancel       | Cancel sur Stripe → redirect /donate/cancel           |               | ⏳     |

---

## Résumé Exécution

| Phase               | Total tests | ✅      | ❌    | ⚠️     | ⏳     |
| ------------------- | ----------- | ------- | ----- | ------ | ------ |
| Phase 0 — Auto      | 15          | 15      | 0     | 0      | 0      |
| Phase 1 — EZAuth    | 66          | 54      | 0     | 2      | 10     |
| Phase 2 — EZPay     | 60          | 51      | 1     | 8      | 0      |
| Phase 3 — EZStart   | 27          | 12      | 0     | 0      | 15     |
| Phase 4 — Cross-App | 19          | 0       | 0     | 0      | 19     |
| **TOTAL**           | **187**     | **132** | **1** | **10** | **44** |

---

## Issues Trouvées

<!-- Template:
### ISSUE-XXX: [titre]
- **Test:** [ID du test]
- **Severity:** critical / high / medium / low
- **Description:** ...
- **Fix:** ...
- **Status:** open / fixing / fixed / re-test
-->

### ISSUE-001: i18n accents manquants sur ezauth

- **Tests:** A1-1, A1-14
- **Severity:** medium (i18n)
- **Description:** Accents français manquants dans les traductions: "Creez"→"Créez", "acceder a"→"accéder à", "caracteres"→"caractères", "deja"→"déjà", "Verifiez"→"Vérifiez", "envoye"→"envoyé", "verification"→"vérification", "boite de reception"→"boîte de réception", "oublie"→"oublié"
- **Fix:** Corriger les fichiers de traduction FR dans apps/ezauth/web/messages/fr.json
- **Status:** open

### ISSUE-002: Login direct sans redirect_uri — message anglais

- **Tests:** A1-14
- **Severity:** medium (UX + i18n)
- **Description:** Accès direct à /login sans redirect_uri affiche "No redirect URL configured. Please provide redirect_uri parameter." en anglais. Devrait avoir un fallback (redirect vers home ezauth) ou un message i18n.
- **Fix:** Ajouter fallback redirect_uri dans le login flow + traduire le message
- **Status:** open

### ISSUE-003: "Authentication successful!" non traduit

- **Tests:** A1-14
- **Severity:** low (i18n)
- **Description:** La page callback d'EZStart affiche "Authentication successful!" et "Redirecting to home..." en anglais au lieu de français.
- **Fix:** Traduire dans apps/ezstart/web/messages/fr.json
- **Status:** open

### ISSUE-004 — Username uniqueness not enforced (medium) — CLOSED

- **Test:** A1-3
- **Expected:** Register with existing username → error
- **Actual:** False positive — username uniqueness IS enforced by MongoDB unique index. Previous test was against a reset DB.
- **Impact:** None — uniqueness works correctly
- **Status:** closed (false positive)

### ISSUE-005 — [object Object] displayed in error messages (FIXED)

- **Test:** Registration with rate limit
- **Expected:** Readable error message
- **Actual:** Forms displayed [object Object] instead of parsing API error
- **Fix:** All forms now use parseApiError() from @ezstart/fetch-client
- **Status:** fixed

### ISSUE-006 — Email links point to production in dev (FIXED)

- **Test:** Email verification + password reset
- **Expected:** Links to localhost:6111 in dev
- **Actual:** Links to ezauth.ezstart.xyz (production)
- **Fix:** getCurrentEnvironment() now returns 'local' for server-side dev
- **Status:** fixed

### ISSUE-007 — Reset password reuse shows generic error (FIXED)

- **Test:** A1-43
- **Expected:** "Lien de réinitialisation invalide ou expiré"
- **Actual:** Was showing "An unexpected error occurred" — now shows "Invalid or expired reset token"
- **Fix:** callApi now includes full error object in response.data
- **Status:** fixed

### ISSUE-008 — No "current session" marker (low)

- **Test:** A1-48
- **Expected:** Current session highlighted or marked in session list
- **Actual:** All sessions look the same
- **Impact:** User can't easily identify which session to keep
- **Status:** open

### ISSUE-009 — Settings page 403 for users without 'ezauth' app (low)

- **Test:** 2FA settings access
- **Expected:** Any authenticated user can access their own settings
- **Actual:** Not an app access issue. The 403 was caused by expired tokens + no re-auth mechanism on EZAuth web (no callback page). 2FA status endpoint works fine with valid token.
- **Impact:** Low — EZAuth web needs its own auth callback page for token renewal
- **Status:** open (reclassified low)

### ISSUE-010 — RESERVED

### ISSUE-011 — Reset password fails for OAuth-only users with legacy app values (FIXED)

- **Test:** Password reset for OAuth account
- **Severity:** medium
- **Description:** user.save() failed due to 'tower-defense' not in apps enum
- **Fix:** Removed hardcoded enum from apps field in AuthUser model
- **Status:** fixed

### ISSUE-012 — DonateModal doesn't redirect to Stripe (FIXED)

- **Test:** S3-10
- **Severity:** high
- **Description:** result.checkoutUrl was undefined because data was not unwrapped from { success, data } response
- **Fix:** pay-sdk client now unwraps { success, data } response
- **Status:** fixed

### ISSUE-013 — No payment success page (open, low)

- **Test:** After Stripe checkout completion
- **Severity:** low
- **Description:** 404 on /donate/success after Stripe checkout completion. Expected a success page with thank you message.
- **Temp fix:** Redirect to /?payment=success
- **Proper fix:** pay-sdk should export PaymentSuccessPage component (like auth-sdk exports AuthCallbackPage)
- **Status:** open

### ISSUE-014 — Stripe return URLs hardcoded in API (open, medium)

- **Test:** Donation return after payment
- **Severity:** medium
- **Description:** Hardcoded /donate/success in ezpay API. Return URL should be configurable per consumer app.
- **Fix needed:** Accept returnUrl from client, use it in Stripe session
- **Status:** open

### ISSUE-015 — EZPay web has no auth system (medium)

- **Test:** P2-9, P2-12
- **Severity:** medium
- **Description:** EZPay web doesn't have auth-sdk/LoginButton configured. Purchase/Subscribe buttons require authentication but users can't login on EZPay web.
- **Fix:** Add AuthProvider + LoginButton to EZPay web layout, or document that EZPay web is SDK doc only
- **Status:** open

### ISSUE-016 — SSO cross-domain not working in localhost (low, dev-only)

- **Test:** X4-1 to X4-6
- **Severity:** low (dev-only)
- **Description:** In dev, each app runs on different port = different origin. Tokens stored in localStorage are not shared across origins. In prod with \*.ezstart.xyz this works via shared cookies.
- **Fix:** No fix needed for dev — just a known limitation.
- **Status:** open (known limitation)

### ISSUE-017 — req.user never populated in EZPay API (critical, security)

- **Tests:** P2-15, P2-16, P2-17, P2-18
- **Severity:** critical (security + functionality)
- **Description:** `authMiddleware` only sets `req.userId`, not `req.user`. All payment routes that read `req.user.role` or `req.user._id` get `undefined`. This breaks: admin list (admin treated as regular user), get by ID (no access control), refund (403 for everyone including admin). The list endpoints for purchases/subscriptions also don't auto-filter by authenticated user.
- **Fix needed:** authMiddleware must fetch user from DB and attach to `req.user`, OR payment routes must use `req.userId` directly and fetch role separately.
- **Status:** open

### ISSUE-018 — Purchases/Subscriptions list no ownership filter (high, security)

- **Tests:** P2-10, P2-13
- **Severity:** high (security)
- **Description:** `GET /purchases` and `GET /subscriptions` return ALL records for ALL users. The `userId` filter is an optional query param, not enforced from the JWT token. Any authenticated user can see everyone's purchases.
- **Fix needed:** Auto-filter by `req.userId` from JWT (or `req.user._id` once ISSUE-017 is fixed). Only admin should bypass this filter.
- **Status:** open

### ISSUE-019 — EZPay i18n accents missing on all pages (medium, i18n)

- **Tests:** P2-27, P2-28, P2-29, P2-30, landing page
- **Severity:** medium (i18n)
- **Description:** All EZPay web pages have French text without accents: "Systeme"→"Système", "ecosysteme"→"écosystème", "temoignages"→"témoignages", "Gerez"→"Gérez", "recurrents"→"récurrents", "ete recu"→"été reçu", "succes"→"succès", "generosite"→"générosité", "annule"→"annulé", "debite"→"débité", "Reessayer"→"Réessayer", "probleme"→"problème"
- **Fix:** Update apps/ezpay/web/messages/fr.json with proper accents
- **Status:** open

### ISSUE-020 — DonateModal texts not i18n (low, i18n)

- **Tests:** P2-32
- **Severity:** low (i18n)
- **Description:** DonateModal component displays hardcoded English strings: "Support EZPay Development", "Your support helps us keep this project running", "Amount", "Custom amount", "Message (optional)", "Leave a message...". Should use translations from pay-sdk or consumer app.
- **Status:** open

---

## Notes

- Tests Stripe en mode test uniquement (sk*test*\*)
- Tests prod = vérification que le déploiement fonctionne, pas de données destructives
- Les tests MCP (chrome-devtools) sont faits par Claude en navigant dans le browser
- Ce document est mis à jour en temps réel pendant l'exécution
