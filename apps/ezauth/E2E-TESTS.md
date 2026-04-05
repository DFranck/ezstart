# E2E Tests — EZAuth

**Derniere execution complete :** 2026-04-05
**Environnement :** Dev (localhost)
**Legende :** ✅ pass | ❌ fail | ⏳ a tester | ⚠️ partiel

---

## 1. Registration

| ID   | Test                                     | Comment tester                                                       | Derniere date | Status |
| ---- | ---------------------------------------- | -------------------------------------------------------------------- | ------------- | ------ |
| A1-1 | Register — email/password valides        | /register → remplir form → compte cree, redirect verification email  | 2026-04-04    | ✅     |
| A1-2 | Register — email deja pris               | /register → email existant → erreur "Cet email est deja utilise"     | 2026-04-04    | ✅     |
| A1-3 | Register — username deja pris            | /register → username existant → erreur unique index                  | 2026-04-04    | ✅     |
| A1-4 | Register — password trop court (<6)      | /register → password < 6 chars → validation inline bloque submit     | 2026-04-04    | ✅     |
| A1-5 | Register — confirm password mismatch     | /register → passwords differents → erreur inline                     | 2026-04-04    | ✅     |
| A1-6 | Register — check availability (debounce) | /register → taper email/username → feedback temps reel disponibilite | —             | ⏳     |
| A1-7 | Register — password strength indicator   | /register → taper password → barre de force visible (3 segments)     | 2026-04-04    | ✅     |
| A1-8 | Register — avec access code (waitlist)   | /register → code access waitlist → compte cree avec acces app        | —             | ⏳     |

## 2. Email Verification

| ID    | Test                                | Comment tester                                                | Derniere date | Status |
| ----- | ----------------------------------- | ------------------------------------------------------------- | ------------- | ------ |
| A1-9  | Verify email — token valide         | Clic lien email Resend → "Email verifie avec succes !"        | 2026-04-04    | ✅     |
| A1-10 | Verify email — token expire         | Clic lien expire → "Lien de verification invalide ou expire." | 2026-04-04    | ✅     |
| A1-11 | Verify email — token invalide       | URL avec token random → meme message securise                 | 2026-04-04    | ✅     |
| A1-12 | Resend verification — user connecte | /settings → resend verification → nouvel email envoye         | —             | ⏳     |
| A1-13 | Resend verification — rate limit    | Resend 3x → 429 bloque apres 2 req, retryAfter affiche        | 2026-04-04    | ✅     |

## 3. Login & SSO

| ID    | Test                          | Comment tester                                                                | Derniere date | Status |
| ----- | ----------------------------- | ----------------------------------------------------------------------------- | ------------- | ------ |
| A1-14 | Login — credentials valides   | /login → email + password → redirect app source → "Authentication successful" | 2026-04-04    | ✅     |
| A1-15 | Login — mauvais password      | /login → mauvais password → "Invalid credentials" (pas de leak)               | 2026-04-04    | ✅     |
| A1-16 | Login — email inexistant      | /login → email random → meme message "Invalid credentials"                    | 2026-04-04    | ✅     |
| A1-17 | Login — rate limit            | /login → 5 tentatives → 429 "Too many attempts" + retryAfter                  | 2026-04-04    | ✅     |
| A1-18 | Login cookie — httpOnly mode  | curl POST /login-cookie sans CSRF → 403 "CSRF token mismatch"                 | 2026-04-04    | ✅     |
| A1-19 | Login — redirect_uri preserve | Login depuis EZBill/Gacha → redirect_uri preservee → retour app source        | 2026-04-04    | ✅     |

## 4. Token Exchange & Refresh

| ID    | Test                                       | Comment tester                                                              | Derniere date | Status |
| ----- | ------------------------------------------ | --------------------------------------------------------------------------- | ------------- | ------ |
| A1-20 | Token exchange — code valide               | POST /token → access_token (15min) + refresh_token retournes                | 2026-04-04    | ✅     |
| A1-21 | Token exchange — code expire               | POST /token code expire → "Invalid or expired authorization code"           | 2026-04-04    | ✅     |
| A1-22 | Token exchange — code deja utilise         | POST /token code replay → "Invalid or expired authorization code"           | 2026-04-04    | ✅     |
| A1-23 | Refresh token — token valide               | POST /refresh → nouveau access_token + nouveau refresh_token (rotation)     | 2026-04-04    | ✅     |
| A1-24 | Refresh token — token expire               | POST /refresh token expire → 401 "Invalid refresh token"                    | 2026-04-04    | ✅     |
| A1-25 | Refresh token — token revoque              | POST /refresh token random → 401 "Invalid refresh token"                    | 2026-04-04    | ✅     |
| A1-26 | Refresh token — reutilisation ancien token | POST /refresh ancien token post-rotation → "Refresh token has been revoked" | 2026-04-04    | ✅     |
| A1-27 | Auto-refresh transparent                   | Access token expire → auth-sdk refresh auto → pas d'interruption user       | —             | ⏳     |

## 5. Google OAuth

| ID    | Test                               | Comment tester                                                | Derniere date | Status |
| ----- | ---------------------------------- | ------------------------------------------------------------- | ------------- | ------ |
| A1-28 | OAuth — nouveau user               | Clic "Google" → compte cree, OAuth account lie, redirect app  | 2026-04-04    | ✅     |
| A1-29 | OAuth — user existant (meme email) | Clic "Google" sur email existant → compte lie, pas de doublon | 2026-04-04    | ✅     |
| A1-30 | OAuth — redirect_uri validee       | OAuth avec origin non-whitelist → bloque                      | —             | ⏳     |

## 6. Two-Factor Authentication

| ID    | Test                          | Comment tester                                                        | Derniere date | Status |
| ----- | ----------------------------- | --------------------------------------------------------------------- | ------------- | ------ |
| A1-31 | 2FA setup — generer secret    | /settings → activer 2FA → QR code affiche, scanner avec Authenticator | 2026-04-04    | ✅     |
| A1-32 | 2FA verify — code TOTP valide | Entrer code TOTP → 2FA active, 8 backup codes generes                 | 2026-04-04    | ✅     |
| A1-33 | 2FA verify — code invalide    | Entrer code faux → "Invalid code", 2FA pas active                     | —             | ⏳     |
| A1-34 | 2FA login — code valide       | /login avec 2FA → page code → code authenticator → login complete     | 2026-04-04    | ✅     |
| A1-35 | 2FA login — code invalide     | /login avec 2FA → mauvais code → "Invalid 2FA code", login bloque     | 2026-04-04    | ✅     |
| A1-36 | 2FA login — backup code       | /login avec 2FA → backup code → login complete, code consomme         | 2026-04-04    | ✅     |
| A1-37 | 2FA disable — code valide     | /settings → desactiver 2FA → code TOTP → 2FA desactive                | 2026-04-04    | ✅     |
| A1-38 | 2FA status — check            | /settings → "Desactive" visible si 2FA off                            | 2026-04-04    | ✅     |

## 7. Password Reset

| ID    | Test                                         | Comment tester                                                            | Derniere date | Status |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------- | ------------- | ------ |
| A1-39 | Forgot password — email existant             | /forgot-password → email → message securise + email Resend envoye         | 2026-04-04    | ✅     |
| A1-40 | Forgot password — email inexistant           | /forgot-password → email random → meme message (pas de leak)              | 2026-04-04    | ✅     |
| A1-41 | Forgot password — rate limit                 | /forgot-password 3x → 429 bloque, retryAfter=900s                         | 2026-04-04    | ✅     |
| A1-42 | Reset password — token valide                | Clic lien email → nouveau password → "Mot de passe reinitialise !"        | 2026-04-04    | ✅     |
| A1-43 | Reset password — token expire                | Clic lien expire → "Invalid or expired reset token" + lien "Nouveau lien" | 2026-04-04    | ✅     |
| A1-44 | Reset password — nouveau password fonctionne | Login avec nouveau password → flow SSO complet → connecte                 | 2026-04-04    | ✅     |

## 8. Session Management

| ID    | Test                           | Comment tester                                                         | Derniere date | Status |
| ----- | ------------------------------ | ---------------------------------------------------------------------- | ------------- | ------ |
| A1-45 | List sessions                  | /settings → sessions → liste avec user-agent, IP, date                 | 2026-04-04    | ✅     |
| A1-46 | Revoke session — une seule     | Clic Revoquer sur une session → session supprimee, les autres intactes | 2026-04-04    | ✅     |
| A1-47 | Revoke all — logout everywhere | Clic "Revoquer toutes" → toutes sessions supprimees sauf courante      | 2026-04-04    | ✅     |
| A1-48 | Session — current marker       | Badge "Session actuelle" visible dans la liste                         | 2026-04-04    | ⚠️     |

## 9. Profile & Account

| ID    | Test                                 | Comment tester                                                | Derniere date | Status |
| ----- | ------------------------------------ | ------------------------------------------------------------- | ------------- | ------ |
| A1-49 | Update profile — nom                 | /settings → modifier firstName/lastName → sauvegarde OK       | 2026-04-04    | ✅     |
| A1-50 | Update profile — avatar              | /settings → modifier avatar URL → mis a jour                  | 2026-04-04    | ✅     |
| A1-51 | Delete account — confirmation        | /settings → supprimer compte → confirmation → compte supprime | —             | ⏳     |
| A1-52 | Delete account — re-login impossible | Login post-delete → "Invalid credentials"                     | 2026-04-04    | ✅     |

## 10. Admin

| ID    | Test                    | Comment tester                                                   | Derniere date | Status |
| ----- | ----------------------- | ---------------------------------------------------------------- | ------------- | ------ |
| A1-53 | Admin — list users      | GET /admin/users → liste paginee + meta pagination               | 2026-04-04    | ✅     |
| A1-54 | Admin — filter by role  | GET /admin/users?search=franck → resultats filtres               | 2026-04-04    | ✅     |
| A1-55 | Admin — edit user roles | PATCH /admin/users/:id → roles mis a jour, validation Zod active | 2026-04-04    | ⚠️     |
| A1-56 | Admin — delete user     | DELETE /admin/users/:id → "User deleted successfully"            | 2026-04-04    | ✅     |
| A1-57 | Admin — non-admin acces | GET /admin/users sans role admin → 403 forbidden                 | —             | ⏳     |
| A1-58 | Admin — waitlist list   | GET /admin/waitlist → liste emails par app                       | —             | ⏳     |
| A1-59 | Admin — waitlist invite | POST /admin/waitlist/invite → email invite, access code genere   | —             | ⏳     |

## 11. Security

| ID    | Test                           | Comment tester                                                       | Derniere date | Status |
| ----- | ------------------------------ | -------------------------------------------------------------------- | ------------- | ------ |
| A1-60 | CSRF — login-cookie sans token | curl POST /login-cookie sans CSRF → 403 "CSRF token mismatch"        | 2026-04-04    | ✅     |
| A1-61 | CSRF — token valide            | Login via navigateur avec CSRF token → login OK                      | 2026-04-04    | ✅     |
| A1-62 | JWT — token expire             | curl avec JWT expire → 401 "Authentication required"                 | 2026-04-04    | ✅     |
| A1-63 | JWT — token malformed          | curl avec JWT random → 401 "Authentication required"                 | 2026-04-04    | ✅     |
| A1-64 | OAuth token encryption         | Code review → AES-256-GCM encryption (crypto.ts), IV random 16 bytes | 2026-04-04    | ✅     |
| A1-65 | Password hashing               | Code review → bcrypt salt factor 12, refresh tokens SHA-256          | 2026-04-04    | ✅     |
| A1-66 | No secrets in response         | Code review → aucun passwordHash/totpSecret/backupCodes en reponse   | 2026-04-04    | ✅     |

## 12. Admin Dashboard

| ID    | Test                   | Comment tester                             | Derniere date | Status |
| ----- | ---------------------- | ------------------------------------------ | ------------- | ------ |
| ADM-1 | Liste users paginee    | /admin → table users avec pagination       | —             | ⏳     |
| ADM-2 | Search users           | Recherche par email/username               | —             | ⏳     |
| ADM-3 | Edit user roles        | PATCH user → roles mis a jour              | —             | ⏳     |
| ADM-4 | Delete user            | DELETE user → supprime                     | —             | ⏳     |
| ADM-5 | Waitlist list          | Liste des emails waitlist                  | —             | ⏳     |
| ADM-6 | Waitlist invite        | Inviter un email → access code genere      | —             | ⏳     |
| ADM-7 | Session current marker | Badge "Session actuelle" visible           | 2026-04-05    | ✅     |
| ADM-8 | Error messages i18n    | Erreurs API traduites en FR dans les forms | 2026-04-05    | ✅     |

## 13. API Automated Tests

| ID     | Test             | Comment tester                  | Derniere date | Status |
| ------ | ---------------- | ------------------------------- | ------------- | ------ |
| AUTO-1 | TypeScript check | tsc --noEmit → 0 erreurs        | 2026-04-05    | ✅     |
| AUTO-2 | Unit tests       | vitest run → 48/48 passed       | 2026-04-05    | ✅     |
| AUTO-3 | Secrets grep     | grep sk_live/password → 0 match | 2026-04-04    | ✅     |
| AUTO-4 | Build web        | next build → success            | 2026-04-04    | ✅     |

## 14. RBAC Simplification

| ID      | Test                                 | Comment tester                                                  | Derniere date | Status |
| ------- | ------------------------------------ | --------------------------------------------------------------- | ------------- | ------ |
| RBAC-1  | Login SSO — globalRoles dans JWT     | Login → decode JWT → globalRoles present, roles absent          | —             | ⏳     |
| RBAC-2  | Login SSO — appRoles dans JWT        | Login → decode JWT → appRoles present avec app roles            | —             | ⏳     |
| RBAC-3  | Admin EZPay — accès via appRoles     | User avec appRoles.ezpay=['admin'] → /admin accessible          | —             | ⏳     |
| RBAC-4  | Admin EZAuth — page dashboard        | /admin → liste users, search, pagination                        | —             | ⏳     |
| RBAC-5  | Admin EZAuth — edit roles            | Edit user → modifier globalRoles/appRoles → sauvegarde OK       | —             | ⏳     |
| RBAC-6  | Admin EZAuth — delete user           | Delete user → confirmation → user supprime                      | —             | ⏳     |
| RBAC-7  | Admin EZAuth — waitlist              | Liste waitlist + invite email                                   | —             | ⏳     |
| RBAC-8  | Non-admin — acces refuse             | User sans admin role → /admin → InsufficientPermissions         | —             | ⏳     |
| RBAC-9  | requireRole middleware — sans legacy | API avec requireRole('admin') → check globalRoles/appRoles only | —             | ⏳     |
| RBAC-10 | Migration — legacy roles converties  | Users avec ancien roles[] → globalRoles/appRoles corrects       | —             | ⏳     |

---

## Resume

| Section                   | Total  | ✅     | ⏳     | ⚠️    |
| ------------------------- | ------ | ------ | ------ | ----- |
| Registration              | 8      | 6      | 2      | 0     |
| Email Verification        | 5      | 4      | 1      | 0     |
| Login & SSO               | 6      | 6      | 0      | 0     |
| Token Exchange & Refresh  | 8      | 7      | 1      | 0     |
| Google OAuth              | 3      | 2      | 1      | 0     |
| Two-Factor Authentication | 8      | 7      | 1      | 0     |
| Password Reset            | 6      | 6      | 0      | 0     |
| Session Management        | 4      | 3      | 0      | 1     |
| Profile & Account         | 4      | 3      | 1      | 0     |
| Admin                     | 7      | 3      | 3      | 1     |
| Security                  | 7      | 7      | 0      | 0     |
| Admin Dashboard           | 8      | 2      | 6      | 0     |
| API Automated Tests       | 4      | 4      | 0      | 0     |
| RBAC Simplification       | 10     | 0      | 10     | 0     |
| **TOTAL**                 | **88** | **60** | **26** | **2** |
