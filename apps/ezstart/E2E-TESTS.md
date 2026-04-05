# E2E Tests — EZStart

**Derniere execution complete :** 2026-04-05
**Environnement :** Dev (localhost)
**Legende :** ✅ pass | ❌ fail | ⏳ a tester | ⚠️ partiel

---

## 1. Landing Page & Core

| ID   | Test             | Comment tester                                                                                                | Derniere date | Status |
| ---- | ---------------- | ------------------------------------------------------------------------------------------------------------- | ------------- | ------ |
| S3-1 | Landing page FR  | Hero, Skills, Projects, Libs, Support, Contact — toutes sections rendues. 8 projets avec images/descriptions. | 2026-04-04    | ✅     |
| S3-2 | Landing page EN  | Switch FR→EN, tous textes traduits. URL /fr → /en.                                                            | 2026-04-04    | ✅     |
| S3-3 | Theme toggle     | Light/dark mode toggle instantane. Design adapte dans les deux modes.                                         | 2026-04-04    | ✅     |
| S3-4 | SSO Login flow   | Connexion → EZAuth /fr/login → credentials → callback → 'Authentification reussie !' → home connecte.         | 2026-04-04    | ✅     |
| S3-5 | Logout           | Deconnexion → bouton revient a 'Connexion'. Instantane, pas de redirect.                                      | 2026-04-04    | ✅     |
| S3-6 | Locale cross-app | EZStart FR → EZAuth /fr/login. EZStart EN → EZAuth /en/login. Locale preservee.                               | 2026-04-04    | ✅     |

## 2. Auth Integration

| ID    | Test                             | Comment tester                                                                                         | Derniere date | Status |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------- | ------ |
| S3-7  | Legal notices                    | Page mentions legales complete en FR                                                                   | 2026-04-04    | ✅     |
| S3-8  | Monitoring API                   | /api/health — scheduler running, 12 services monitored                                                 | 2026-04-04    | ✅     |
| S3-9  | EZStart API health               | /health — status ok                                                                                    | 2026-04-04    | ✅     |
| S3-10 | Donate modal                     | Modal → API → Stripe checkout redirect → paiement complete. Fix: unwrap data dans pay-sdk client.      | 2026-04-04    | ✅     |
| S3-11 | Donation wall                    | Empty state 'Soyez le premier a soutenir !'. Pas de crash.                                             | 2026-04-04    | ✅     |
| S3-12 | Monitoring dashboard             | Dashboard monitoring: Sante Globale 96.6/100, Qualite Code 92/100, 0 erreurs critiques, 377ms moyenne. | 2026-04-04    | ✅     |
| S3-13 | Protected pages — non superadmin | Acces refuse (monitoring/admin)                                                                        | —             | ⏳     |

## 3. Monitoring Dashboard

| ID    | Test                 | Comment tester                                  | Derniere date | Status |
| ----- | -------------------- | ----------------------------------------------- | ------------- | ------ |
| S3-14 | Overview             | Health global, count erreurs, count audits      | —             | ⏳     |
| S3-15 | Real-time Socket.IO  | Donnees se mettent a jour sans refresh          | —             | ⏳     |
| S3-16 | Health page          | Status par service (healthy/degraded/unhealthy) | —             | ⏳     |
| S3-17 | Health — history     | Historique uptime 24h/7d/30d                    | —             | ⏳     |
| S3-18 | Errors page          | Feed erreurs Sentry, filtres severity           | —             | ⏳     |
| S3-19 | Audits page          | Scores audits, details, filtres                 | —             | ⏳     |
| S3-20 | Trigger manual check | POST trigger → refresh donnees                  | —             | ⏳     |

## 4. Admin Panel

| ID    | Test                | Comment tester                  | Derniere date | Status |
| ----- | ------------------- | ------------------------------- | ------------- | ------ |
| S3-21 | User list           | Liste paginee (50/page)         | —             | ⏳     |
| S3-22 | User search         | Search par nom/email fonctionne | —             | ⏳     |
| S3-23 | User filter by role | Filtre par role fonctionne      | —             | ⏳     |
| S3-24 | User edit           | Modification roles/permissions  | —             | ⏳     |

## 5. Feature Demos

| ID    | Test          | Comment tester                      | Derniere date | Status |
| ----- | ------------- | ----------------------------------- | ------------- | ------ |
| S3-25 | CV Generator  | Form → preview → rendu correct      | —             | ⏳     |
| S3-26 | QR Code       | Input → QR genere → customisation   | —             | ⏳     |
| S3-27 | Business Card | Form → card preview → rendu correct | —             | ⏳     |

## 6. Support / Donations

| ID    | Test                   | Comment tester                                    | Derniere date | Status |
| ----- | ---------------------- | ------------------------------------------------- | ------------- | ------ |
| SUP-1 | DonateButton visible   | Section "Soutenir mon travail" avec bouton Donate | 2026-04-04    | ✅     |
| SUP-2 | DonationWall           | Empty state "Soyez le premier a soutenir !"       | 2026-04-04    | ✅     |
| SUP-3 | DonateModal fonctionne | Clic Donate → modal → montants                    | 2026-04-04    | ✅     |
| SUP-4 | Donation e2e Stripe    | Modal → Stripe checkout → webhook → completed     | 2026-04-04    | ✅     |
| SUP-5 | /donate/success        | Page "Merci !" avec accents FR                    | 2026-04-05    | ✅     |
| SUP-6 | /donate/cancel         | Page "Paiement annule"                            | 2026-04-05    | ✅     |

## 7. SSO Cross-App

| ID    | Test                                    | Comment tester                              | Derniere date | Status |
| ----- | --------------------------------------- | ------------------------------------------- | ------------- | ------ |
| X4-1  | Login ezauth → acces ezbill             | Token valide, redirect OK, user data charge | —             | ⏳     |
| X4-2  | Login ezauth → acces gacha-analyzer     | Token valide, redirect OK                   | —             | ⏳     |
| X4-3  | Login ezauth → acces green-pulse        | Token valide, redirect OK                   | —             | ⏳     |
| X4-4  | Login ezauth → acces fengshui           | Token valide, redirect OK                   | —             | ⏳     |
| X4-5  | Login ezauth → acces ezstart monitoring | Token valide, RBAC superadmin OK            | —             | ⏳     |
| X4-6  | Logout — deconnexion globale            | Token revoque, toutes apps deconnectees     | —             | ⏳     |
| X4-7  | Access token expire en navigation       | Refresh transparent, pas d'interruption     | —             | ⏳     |
| X4-8  | Refresh token expire                    | Redirect login, pas d'erreur 500            | —             | ⏳     |
| X4-9  | Admin ezstart → monitoring              | Acces OK                                    | —             | ⏳     |
| X4-10 | User standard → monitoring              | Acces refuse, redirect                      | —             | ⏳     |
| X4-11 | User avec appRole ezbill                | Acces ezbill OK, pas admin ezstart          | —             | ⏳     |

## 8. Health Checks Prod

| ID    | Test                               | Comment tester                                     | Derniere date | Status |
| ----- | ---------------------------------- | -------------------------------------------------- | ------------- | ------ |
| X4-12 | EZAuth API health                  | https://ezauth-api.up.railway.app/health → 200     | —             | ⏳     |
| X4-13 | EZPay API health                   | https://ezpay-api.up.railway.app/health → 200      | —             | ⏳     |
| X4-14 | EZStart API health                 | https://ezstart-api.up.railway.app/health → 200    | —             | ⏳     |
| X4-15 | EZBill API health                  | https://ezbill-api.up.railway.app/health → 200     | —             | ⏳     |
| X4-16 | GreenPulse API health              | https://greenpulse-api.up.railway.app/health → 200 | —             | ⏳     |
| X4-17 | Monitoring detecte un service down | Service marque unhealthy, alerte (si wired)        | —             | ⏳     |

## 9. CRM/CMS/SuperAdmin Dashboard

| ID     | Test                    | Comment tester                                            | Derniere date | Status |
| ------ | ----------------------- | --------------------------------------------------------- | ------------- | ------ |
| CRM-1  | User list paginee       | /admin → table users avec pagination server-side          | —             | ⏳     |
| CRM-2  | User search server-side | Recherche email/username → resultats filtres cote serveur | —             | ⏳     |
| CRM-3  | User creation           | Creer un user depuis le panel admin                       | —             | ⏳     |
| CRM-4  | User edit roles         | Modifier globalRoles et appRoles                          | —             | ⏳     |
| CRM-5  | User delete/deactivate  | Supprimer ou desactiver un user                           | —             | ⏳     |
| CRM-6  | User detail page        | Profil complet, sessions, paiements, apps                 | —             | ⏳     |
| CRM-7  | Bulk operations         | Select multiple → assign role / delete                    | —             | ⏳     |
| CRM-8  | Export CSV/JSON         | Exporter les users filtres                                | —             | ⏳     |
| CMS-1  | Gestion projets         | CRUD projets landing page (order, visibility)             | —             | ⏳     |
| CMS-2  | Gestion features        | Enable/disable feature demos                              | —             | ⏳     |
| CMS-3  | Edit textes/traductions | Edit inline, preview                                      | —             | ⏳     |
| CMS-4  | Upload images/assets    | Upload et gestion des images                              | —             | ⏳     |
| DASH-1 | Sidebar navigation      | Dashboard/Users/Content/Monitoring/Settings               | —             | ⏳     |
| DASH-2 | Stats dashboard         | Users actifs, inscriptions/jour                           | —             | ⏳     |
| DASH-3 | Payment overview        | Vue globale paiements via pay-sdk                         | —             | ⏳     |
| DASH-4 | Real-time notifications | New users, errors, payments                               | —             | ⏳     |
| DASH-5 | Quick actions           | Ban user, trigger health check, view logs                 | —             | ⏳     |

## 10. API Automated Tests

| ID     | Test                 | Comment tester                  | Derniere date | Status |
| ------ | -------------------- | ------------------------------- | ------------- | ------ |
| AUTO-1 | TypeScript check API | tsc --noEmit → 0 erreurs        | 2026-04-05    | ✅     |
| AUTO-2 | Unit tests API       | vitest run → tous passent       | 2026-04-04    | ✅     |
| AUTO-3 | Secrets grep         | grep sk_live/password → 0 match | 2026-04-04    | ✅     |
| AUTO-4 | TypeScript check Web | tsc --noEmit → 0 erreurs        | 2026-04-05    | ✅     |
| AUTO-5 | Build web            | next build → success            | 2026-04-04    | ✅     |

---

## Resume

| Section              | Total  | ✅     | ⏳     | ⚠️    |
| -------------------- | ------ | ------ | ------ | ----- |
| Landing Page & Core  | 6      | 6      | 0      | 0     |
| Auth Integration     | 7      | 6      | 1      | 0     |
| Monitoring Dashboard | 7      | 0      | 7      | 0     |
| Admin Panel          | 4      | 0      | 4      | 0     |
| Feature Demos        | 3      | 0      | 3      | 0     |
| Support / Donations  | 6      | 6      | 0      | 0     |
| SSO Cross-App        | 11     | 0      | 11     | 0     |
| Health Checks Prod   | 6      | 0      | 6      | 0     |
| CRM/CMS/SuperAdmin   | 17     | 0      | 17     | 0     |
| API Automated Tests  | 5      | 5      | 0      | 0     |
| **TOTAL**            | **72** | **23** | **49** | **0** |
