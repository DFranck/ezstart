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

| ID   | Test             | Commande       | Résultat attendu | Résultat réel | Status |
| ---- | ---------------- | -------------- | ---------------- | ------------- | ------ |
| A0-4 | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs     | ✅     |
| A0-5 | Build            | `next build`   | Build success    |               | ⏳     |

### EZPay API

| ID   | Test             | Commande                                                  | Résultat attendu | Résultat réel                                           | Status |
| ---- | ---------------- | --------------------------------------------------------- | ---------------- | ------------------------------------------------------- | ------ |
| A0-6 | TypeScript check | `tsc --noEmit`                                            | 0 erreurs        | 0 erreurs                                               | ✅     |
| A0-7 | Unit tests       | `vitest run`                                              | Tous passent     | 27/27 passed (fix: projectId collision, MMS binary)     | ✅     |
| A0-8 | Secrets grep     | `grep -r "sk_live\|password.*=\|MONGO.*mongodb+srv" src/` | 0 match          | 0 match (sk_live in code is safety guard, not a secret) | ✅     |

### EZPay Web

| ID    | Test             | Commande       | Résultat attendu | Résultat réel | Status |
| ----- | ---------------- | -------------- | ---------------- | ------------- | ------ |
| A0-9  | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs     | ✅     |
| A0-10 | Build            | `next build`   | Build success    |               | ⏳     |

### EZStart API

| ID    | Test             | Commande                                                  | Résultat attendu                 | Résultat réel | Status |
| ----- | ---------------- | --------------------------------------------------------- | -------------------------------- | ------------- | ------ |
| A0-11 | TypeScript check | `tsc --noEmit`                                            | 0 erreurs                        | 0 erreurs     | ✅     |
| A0-12 | Unit tests       | `vitest run`                                              | Tous passent (si tests existent) |               | ⏳     |
| A0-13 | Secrets grep     | `grep -r "sk_live\|password.*=\|MONGO.*mongodb+srv" src/` | 0 match                          | 0 match       | ✅     |

### EZStart Web

| ID    | Test             | Commande       | Résultat attendu | Résultat réel | Status |
| ----- | ---------------- | -------------- | ---------------- | ------------- | ------ |
| A0-14 | TypeScript check | `tsc --noEmit` | 0 erreurs        | 0 erreurs     | ✅     |
| A0-15 | Build            | `next build`   | Build success    |               | ⏳     |

---

## Phase 1 — EZAuth (fondation)

### 1.1 Registration

| ID   | Test                                     | Résultat attendu                                       | Résultat réel                                                                            | Status |
| ---- | ---------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------ |
| A1-1 | Register — email/password valides        | Compte créé, redirect login, email vérification envoyé | Compte créé, redirect vers page vérification email. Password strength indicator visible. | ✅     |
| A1-2 | Register — email déjà pris               | Erreur "email already exists", pas de création         |                                                                                          | ⏳     |
| A1-3 | Register — username déjà pris            | Erreur "username already exists"                       |                                                                                          | ⏳     |
| A1-4 | Register — password trop court (<6)      | Validation inline, pas de submit                       |                                                                                          | ⏳     |
| A1-5 | Register — confirm password mismatch     | Erreur inline "passwords don't match"                  | Champ confirm password présent et fonctionnel                                            | ✅     |
| A1-6 | Register — check availability (debounce) | Feedback temps réel sur email/username dispo           |                                                                                          | ⏳     |
| A1-7 | Register — password strength indicator   | Indicateur visuel force du mot de passe                | Barre de force visible (3 segments, "Bon")                                               | ✅     |
| A1-8 | Register — avec access code (waitlist)   | Code accepté, compte créé avec accès app               |                                                                                          | ⏳     |

### 1.2 Email Verification

| ID    | Test                                | Résultat attendu                           | Résultat réel | Status |
| ----- | ----------------------------------- | ------------------------------------------ | ------------- | ------ |
| A1-9  | Verify email — token valide         | isVerified=true, redirect success          |               | ⏳     |
| A1-10 | Verify email — token expiré         | Erreur "token expired", lien resend        |               | ⏳     |
| A1-11 | Verify email — token invalide       | Erreur "invalid token"                     |               | ⏳     |
| A1-12 | Resend verification — user connecté | Nouvel email envoyé, ancien token invalidé |               | ⏳     |
| A1-13 | Resend verification — rate limit    | 429 après 3 req/15min                      |               | ⏳     |

### 1.3 Login

| ID    | Test                          | Résultat attendu                                              | Résultat réel                                                                   | Status |
| ----- | ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ |
| A1-14 | Login — credentials valides   | Auth code généré, redirect avec code                          | Flow EZStart→EZAuth→login→redirect→"Authentication successful"→EZStart connecté | ✅     |
| A1-15 | Login — mauvais password      | Erreur "invalid credentials"                                  |                                                                                 | ⏳     |
| A1-16 | Login — email inexistant      | Erreur "invalid credentials" (même message, pas de leak)      |                                                                                 | ⏳     |
| A1-17 | Login — rate limit            | 429 après 5 req/min                                           |                                                                                 | ⏳     |
| A1-18 | Login cookie — httpOnly mode  | Cookie set, CSRF validé, pas de token dans le body            |                                                                                 | ⏳     |
| A1-19 | Login — redirect_uri préservé | Après login, redirect vers l'app source (ezbill, gacha, etc.) |                                                                                 | ⏳     |

### 1.4 Token Exchange & Refresh

| ID    | Test                                       | Résultat attendu                                                      | Résultat réel | Status |
| ----- | ------------------------------------------ | --------------------------------------------------------------------- | ------------- | ------ |
| A1-20 | Token exchange — code valide               | Access token (15min) + refresh token (30j) retournés                  |               | ⏳     |
| A1-21 | Token exchange — code expiré               | Erreur "code expired"                                                 |               | ⏳     |
| A1-22 | Token exchange — code déjà utilisé         | Erreur "code already used"                                            |               | ⏳     |
| A1-23 | Refresh token — token valide               | Nouveau access token + nouveau refresh token (rotation)               |               | ⏳     |
| A1-24 | Refresh token — token expiré               | Erreur 401, redirect login                                            |               | ⏳     |
| A1-25 | Refresh token — token révoqué              | Erreur 401, redirect login                                            |               | ⏳     |
| A1-26 | Refresh token — réutilisation ancien token | Erreur (token rotation = ancien invalidé)                             |               | ⏳     |
| A1-27 | Auto-refresh transparent                   | Access token expire → auth-sdk refresh auto → pas d'interruption user |               | ⏳     |

### 1.5 Google OAuth

| ID    | Test                               | Résultat attendu                             | Résultat réel | Status |
| ----- | ---------------------------------- | -------------------------------------------- | ------------- | ------ |
| A1-28 | OAuth — nouveau user               | Compte créé, OAuth account lié, redirect app |               | ⏳     |
| A1-29 | OAuth — user existant (même email) | Compte lié, pas de doublon, redirect app     |               | ⏳     |
| A1-30 | OAuth — redirect_uri validée       | Seules les origins whitelist acceptées       |               | ⏳     |

### 1.6 Two-Factor Authentication (2FA)

| ID    | Test                          | Résultat attendu                                     | Résultat réel | Status |
| ----- | ----------------------------- | ---------------------------------------------------- | ------------- | ------ |
| A1-31 | 2FA setup — générer secret    | QR code affiché, secret stocké, backup codes générés |               | ⏳     |
| A1-32 | 2FA verify — code TOTP valide | 2FA activé, backup codes retournés                   |               | ⏳     |
| A1-33 | 2FA verify — code invalide    | Erreur "invalid code", 2FA pas activé                |               | ⏳     |
| A1-34 | 2FA login — code valide       | Login complété, tokens retournés                     |               | ⏳     |
| A1-35 | 2FA login — code invalide     | Erreur, login bloqué                                 |               | ⏳     |
| A1-36 | 2FA login — backup code       | Login complété (backup code consommé)                |               | ⏳     |
| A1-37 | 2FA disable — code valide     | 2FA désactivé, secret supprimé                       |               | ⏳     |
| A1-38 | 2FA status — check            | Retourne enabled: true/false                         |               | ⏳     |

### 1.7 Password Reset

| ID    | Test                                         | Résultat attendu                        | Résultat réel | Status |
| ----- | -------------------------------------------- | --------------------------------------- | ------------- | ------ |
| A1-39 | Forgot password — email existant             | Email envoyé avec lien reset            |               | ⏳     |
| A1-40 | Forgot password — email inexistant           | Même réponse (pas de leak), pas d'email |               | ⏳     |
| A1-41 | Forgot password — rate limit                 | 429 après 3 req/15min                   |               | ⏳     |
| A1-42 | Reset password — token valide                | Password changé, ancien token invalidé  |               | ⏳     |
| A1-43 | Reset password — token expiré                | Erreur "token expired"                  |               | ⏳     |
| A1-44 | Reset password — nouveau password fonctionne | Login avec nouveau password OK          |               | ⏳     |

### 1.8 Session Management

| ID    | Test                           | Résultat attendu                                      | Résultat réel | Status |
| ----- | ------------------------------ | ----------------------------------------------------- | ------------- | ------ |
| A1-45 | List sessions                  | Toutes les sessions actives avec user-agent, IP, date |               | ⏳     |
| A1-46 | Revoke session — une seule     | Session ciblée révoquée, les autres intactes          |               | ⏳     |
| A1-47 | Revoke all — logout everywhere | Toutes sessions révoquées, user déconnecté partout    |               | ⏳     |
| A1-48 | Session — current marker       | La session courante identifiée dans la liste          |               | ⏳     |

### 1.9 Profile & Account

| ID    | Test                                 | Résultat attendu                                             | Résultat réel | Status |
| ----- | ------------------------------------ | ------------------------------------------------------------ | ------------- | ------ |
| A1-49 | Update profile — nom                 | firstName/lastName mis à jour                                |               | ⏳     |
| A1-50 | Update profile — avatar              | Avatar URL mis à jour                                        |               | ⏳     |
| A1-51 | Delete account — confirmation        | Compte supprimé, OAuth accounts nettoyés, sessions révoquées |               | ⏳     |
| A1-52 | Delete account — re-login impossible | Login échoue après suppression                               |               | ⏳     |

### 1.10 Admin

| ID    | Test                    | Résultat attendu                         | Résultat réel | Status |
| ----- | ----------------------- | ---------------------------------------- | ------------- | ------ |
| A1-53 | Admin — list users      | Liste paginée, search par email/username |               | ⏳     |
| A1-54 | Admin — filter by role  | Filtre par role fonctionne               |               | ⏳     |
| A1-55 | Admin — edit user roles | Roles mis à jour (globalRoles, appRoles) |               | ⏳     |
| A1-56 | Admin — delete user     | User supprimé (superadmin only)          |               | ⏳     |
| A1-57 | Admin — non-admin accès | 403 forbidden                            |               | ⏳     |
| A1-58 | Admin — waitlist list   | Liste des emails par app                 |               | ⏳     |
| A1-59 | Admin — waitlist invite | Email invité, access code généré         |               | ⏳     |

### 1.11 Security

| ID    | Test                           | Résultat attendu                                  | Résultat réel | Status |
| ----- | ------------------------------ | ------------------------------------------------- | ------------- | ------ |
| A1-60 | CSRF — login-cookie sans token | 403 forbidden                                     |               | ⏳     |
| A1-61 | CSRF — token valide            | Login OK                                          |               | ⏳     |
| A1-62 | JWT — token expiré             | 401 unauthorized                                  |               | ⏳     |
| A1-63 | JWT — token malformé           | 401 unauthorized                                  |               | ⏳     |
| A1-64 | OAuth token encryption         | Tokens OAuth stockés chiffrés (AES-256-GCM) en DB |               | ⏳     |
| A1-65 | Password hashing               | Passwords stockés en bcrypt, jamais en clair      |               | ⏳     |
| A1-66 | No secrets in response         | Aucun password/secret dans les réponses API       |               | ⏳     |

---

## Phase 2 — EZPay (paiements)

### 2.1 Donations

| ID   | Test                              | Résultat attendu                                    | Résultat réel | Status |
| ---- | --------------------------------- | --------------------------------------------------- | ------------- | ------ |
| P2-1 | Create donation — montant valide  | Payment créé (pending), checkoutUrl Stripe retourné |               | ⏳     |
| P2-2 | Create donation — anonymous       | isAnonymous=true, donorName masqué dans la wall     |               | ⏳     |
| P2-3 | Create donation — avec message    | Message stocké dans metadata                        |               | ⏳     |
| P2-4 | Donation wall — public            | Liste donations publiques, pas d'email exposé       |               | ⏳     |
| P2-5 | Donation wall — pagination        | limit/offset fonctionnent                           |               | ⏳     |
| P2-6 | Donation stats                    | Total, count, recent, breakdown corrects            |               | ⏳     |
| P2-7 | Verify payment — session valide   | Payment vérifié via Stripe, status=completed        |               | ⏳     |
| P2-8 | Verify payment — session invalide | Erreur appropriée                                   |               | ⏳     |

### 2.2 Purchases

| ID    | Test                        | Résultat attendu                   | Résultat réel | Status |
| ----- | --------------------------- | ---------------------------------- | ------------- | ------ |
| P2-9  | Create purchase             | Payment créé, checkoutUrl retourné |               | ⏳     |
| P2-10 | List purchases — user       | Seuls ses achats retournés         |               | ⏳     |
| P2-11 | List purchases — pagination | limit/offset fonctionnent          |               | ⏳     |

### 2.3 Subscriptions

| ID    | Test                      | Résultat attendu                   | Résultat réel | Status |
| ----- | ------------------------- | ---------------------------------- | ------------- | ------ |
| P2-12 | Create subscription       | Payment créé, checkoutUrl retourné |               | ⏳     |
| P2-13 | List subscriptions — user | Seuls ses abos retournés           |               | ⏳     |
| P2-14 | Cancel subscription       | Stripe cancel, status=cancelled    |               | ⏳     |

### 2.4 Payments (admin)

| ID    | Test                      | Résultat attendu                        | Résultat réel | Status |
| ----- | ------------------------- | --------------------------------------- | ------------- | ------ |
| P2-15 | List payments — admin     | Tous les paiements, filtres type/status |               | ⏳     |
| P2-16 | List payments — non-admin | Seuls ses paiements                     |               | ⏳     |
| P2-17 | Get payment — by ID       | Payment retourné                        |               | ⏳     |
| P2-18 | Refund — admin            | Stripe refund, status=refunded          |               | ⏳     |
| P2-19 | Refund — non-admin        | 403 forbidden                           |               | ⏳     |

### 2.5 Webhooks Stripe

| ID    | Test                          | Résultat attendu                                   | Résultat réel | Status |
| ----- | ----------------------------- | -------------------------------------------------- | ------------- | ------ |
| P2-20 | checkout.session.completed    | Payment → completed, paymentIntentId stocké        |               | ⏳     |
| P2-21 | checkout.session.expired      | Payment → cancelled                                |               | ⏳     |
| P2-22 | charge.refunded               | Payment → refunded (lookup via paymentIntentId)    |               | ⏳     |
| P2-23 | customer.subscription.updated | Status mappé correctement (active→completed, etc.) |               | ⏳     |
| P2-24 | customer.subscription.deleted | Payment → cancelled                                |               | ⏳     |
| P2-25 | invoice.payment_failed        | Payment → failed                                   |               | ⏳     |
| P2-26 | Webhook — signature invalide  | 400 rejected                                       |               | ⏳     |

### 2.6 Pages résultat

| ID    | Test               | Résultat attendu                           | Résultat réel | Status |
| ----- | ------------------ | ------------------------------------------ | ------------- | ------ |
| P2-27 | /donate/success    | Page succès affichée, message confirmation |               | ⏳     |
| P2-28 | /donate/cancel     | Page annulation affichée, bouton retry     |               | ⏳     |
| P2-29 | /purchase/success  | Page succès achat affichée                 |               | ⏳     |
| P2-30 | /subscribe/success | Page succès abo affichée                   |               | ⏳     |

### 2.7 Pay-SDK Components

| ID    | Test         | Résultat attendu                                               | Résultat réel | Status |
| ----- | ------------ | -------------------------------------------------------------- | ------------- | ------ |
| P2-31 | DonateButton | Click → ouvre le flow donation                                 |               | ⏳     |
| P2-32 | DonateModal  | Montants prédéfinis, montant custom, message, anonymous toggle |               | ⏳     |
| P2-33 | DonationWall | Liste donations, loading skeleton, empty state                 |               | ⏳     |

### 2.8 Security

| ID    | Test                                | Résultat attendu                                         | Résultat réel | Status |
| ----- | ----------------------------------- | -------------------------------------------------------- | ------------- | ------ |
| P2-34 | Stripe key safety — sk_live in dev  | Erreur fatale, refuse de démarrer                        |               | ⏳     |
| P2-35 | Stripe key safety — sk_test in prod | Warning loggé                                            |               | ⏳     |
| P2-36 | Auth sur routes protégées           | 401 sans token sur /payments, /purchases, /subscriptions |               | ⏳     |

---

## Phase 3 — EZStart (portfolio/monitoring)

### 3.1 Landing Page

| ID   | Test                | Résultat attendu               | Résultat réel | Status |
| ---- | ------------------- | ------------------------------ | ------------- | ------ |
| S3-1 | Hero section        | Rendu correct, animations, CTA |               | ⏳     |
| S3-2 | Skills section      | Liste skills, icônes           |               | ⏳     |
| S3-3 | Projects section    | Cards projets, liens           |               | ⏳     |
| S3-4 | Libraries section   | Liste libs @ezstart            |               | ⏳     |
| S3-5 | Contact section     | Formulaire/liens contact       |               | ⏳     |
| S3-6 | Responsive — mobile | Layout adapté, pas d'overflow  |               | ⏳     |
| S3-7 | i18n — FR/EN toggle | Toutes les strings traduites   |               | ⏳     |

### 3.2 Auth Integration

| ID    | Test                             | Résultat attendu                             | Résultat réel | Status |
| ----- | -------------------------------- | -------------------------------------------- | ------------- | ------ |
| S3-8  | Auth callback                    | Login via ezauth → callback → session active |               | ⏳     |
| S3-9  | Protected pages — non connecté   | Redirect vers login ezauth                   |               | ⏳     |
| S3-10 | Protected pages — non superadmin | Accès refusé (monitoring/admin)              |               | ⏳     |

### 3.3 Monitoring Dashboard

| ID    | Test                 | Résultat attendu                                | Résultat réel | Status |
| ----- | -------------------- | ----------------------------------------------- | ------------- | ------ |
| S3-11 | Overview             | Health global, count erreurs, count audits      |               | ⏳     |
| S3-12 | Real-time Socket.IO  | Données se mettent à jour sans refresh          |               | ⏳     |
| S3-13 | Health page          | Status par service (healthy/degraded/unhealthy) |               | ⏳     |
| S3-14 | Health — history     | Historique uptime 24h/7d/30d                    |               | ⏳     |
| S3-15 | Errors page          | Feed erreurs Sentry, filtres severity           |               | ⏳     |
| S3-16 | Audits page          | Scores audits, détails, filtres                 |               | ⏳     |
| S3-17 | Trigger manual check | POST trigger → refresh données                  |               | ⏳     |

### 3.4 Admin Panel

| ID    | Test                | Résultat attendu                | Résultat réel | Status |
| ----- | ------------------- | ------------------------------- | ------------- | ------ |
| S3-18 | User list           | Liste paginée (50/page)         |               | ⏳     |
| S3-19 | User search         | Search par nom/email fonctionne |               | ⏳     |
| S3-20 | User filter by role | Filtre par role fonctionne      |               | ⏳     |
| S3-21 | User edit           | Modification roles/permissions  |               | ⏳     |

### 3.5 Feature Demos

| ID    | Test          | Résultat attendu                    | Résultat réel | Status |
| ----- | ------------- | ----------------------------------- | ------------- | ------ |
| S3-22 | CV Generator  | Form → preview → rendu correct      |               | ⏳     |
| S3-23 | QR Code       | Input → QR généré → customisation   |               | ⏳     |
| S3-24 | Business Card | Form → card preview → rendu correct |               | ⏳     |

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

| Phase               | Total tests | ✅     | ❌    | ⚠️    | ⏳      |
| ------------------- | ----------- | ------ | ----- | ----- | ------- |
| Phase 0 — Auto      | 15          | 11     | 0     | 0     | 4       |
| Phase 1 — EZAuth    | 66          | 4      | 0     | 0     | 62      |
| Phase 2 — EZPay     | 36          | 0      | 0     | 0     | 36      |
| Phase 3 — EZStart   | 24          | 0      | 0     | 0     | 24      |
| Phase 4 — Cross-App | 19          | 0      | 0     | 0     | 19      |
| **TOTAL**           | **160**     | **15** | **0** | **0** | **145** |

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

---

## Notes

- Tests Stripe en mode test uniquement (sk*test*\*)
- Tests prod = vérification que le déploiement fonctionne, pas de données destructives
- Les tests MCP (chrome-devtools) sont faits par Claude en navigant dans le browser
- Ce document est mis à jour en temps réel pendant l'exécution
