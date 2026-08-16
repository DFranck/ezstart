# EZAuth — Roadmap & Gap Analysis

**Last updated** : 2026-04-27
**Current status** : MVP-auth publish-ready (ezauth Web 100/100, ezauth API 100/100, `@ezstart/auth-sdk` 10/10 npm publish-ready)

---

## 🎯 Vision

EZAuth = open-source self-hostable alternative to Clerk/Auth0/Supabase Auth, with a `npm install @ezstart/auth-sdk` drop-in DX.

**Current positioning** : MVP-auth pour startups indie, projets solo, MVP B2C, small SaaS.
**Target positioning** (12 mois) : Clerk-parité sur 80% des use cases (B2B + B2C + Enterprise lite).

---

## 📊 Gap Analysis vs Clerk (référence du marché)

| Catégorie                  | Clerk                                                                                        | ezauth (today)                                         | Gap                      |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| **Auth methods**           | Email+pwd, Magic Link, Phone/SMS, Passkey, Multi-session                                     | Email+pwd seul                                         | 🔴 4 manques             |
| **OAuth providers**        | 20+ (Google, GitHub, Discord, Microsoft, Apple, Twitter, LinkedIn, Slack, Notion, Twitch...) | Google seul                                            | 🔴 19+ manques           |
| **2FA**                    | TOTP, SMS, Backup codes, Phone, Trusted devices                                              | TOTP + Backup codes                                    | 🟡 Partial               |
| **B2B / Organizations** ⭐ | Native : invitations, teams, roles per-org, OrganizationSwitcher                             | ❌ rien (juste Applications multi-tenant)              | 🔴 KILLER feature manque |
| **User profile**           | Avatar upload UI, email change flow, phone, metadata flexible                                | Email/username/avatar URL only                         | 🔴                       |
| **Account linking**        | Auto-merge OAuth + email                                                                     | ❌                                                     | 🔴                       |
| **Pre-built UI**           | SignIn, SignUp, UserProfile, OrgProfile, OrgSwitcher, UserButton (multi-account)             | SignInForm, EZAuthDashboard, UserMenu (single account) | 🟡                       |
| **Email/SMS templates**    | Customisables UI dashboard                                                                   | ❌ hardcoded                                           | 🔴                       |
| **Backend SDKs**           | Node, Go, Python, Ruby, PHP                                                                  | Node Express seul                                      | 🔴                       |
| **Mobile native**          | iOS/Android SDK + Expo                                                                       | ❌ web seul                                            | 🔴                       |
| **SAML SSO**               | Enterprise tier                                                                              | ❌                                                     | 🔴                       |
| **Bot protection**         | Captcha + rate limit                                                                         | Rate limit seul                                        | 🟡                       |
| **User impersonation**     | Admin tool natif                                                                             | ❌                                                     | 🔴                       |
| **Allow/Block lists**      | Email patterns, domains, IPs                                                                 | ❌                                                     | 🔴                       |
| **JWT templates**          | Customisables                                                                                | Standard fixe                                          | 🟡                       |
| **Localization**           | 40+ langues                                                                                  | EN/FR/VI seul                                          | 🟡                       |
| **Theming**                | Full UI customizer dashboard                                                                 | Primary color seul                                     | 🟡                       |
| **Analytics admin**        | Pro dashboard charts                                                                         | ✅ Stats basiques (P3.2 done)                          | 🟢                       |
| **Audit log**              | Pro tier (90d-365d)                                                                          | ✅ Free 30d / Pro 365d                                 | 🟢                       |
| **Compliance certifs**     | SOC 2, HIPAA, FedRAMP                                                                        | ❌                                                     | 🔴                       |
| **Webhooks**               | 20+ events                                                                                   | Limited subset                                         | 🟡                       |
| **Federated admin**        | ❌ (single-tenant dashboard)                                                                 | ✅ AuthAdminDashboard cross-origin                     | 🟢 ⭐ DIFFÉRENCIATEUR    |
| **Open-source**            | ❌ (closed SaaS)                                                                             | ✅ MIT                                                 | 🟢 ⭐ DIFFÉRENCIATEUR    |
| **Self-hostable**          | ❌ (cloud only)                                                                              | ✅                                                     | 🟢 ⭐ DIFFÉRENCIATEUR    |
| **3-layer SDK**            | ❌ (monolithique)                                                                            | ✅ core/react/components                               | 🟢 ⭐ DIFFÉRENCIATEUR    |

**Couverture actuelle vs Clerk** : ~50-60% des features.
**Différenciateurs ezauth** : open-source + self-hostable + 3-layer SDK split + federated admin (cross-app embed via SDK).

---

## 🚀 Roadmap par phases

### Phase 4 — KILLER B2B (highest impact, ~3-4 semaines)

Cible : unlock le marché B2B (où Clerk gagne le plus).

| Feature                                                                                                    | Impact      | Effort       | Quick win | Phase |
| ---------------------------------------------------------------------------------------------------------- | ----------- | ------------ | --------- | ----- |
| **Organizations / Teams** (model + endpoints + invitations + roles per-org + `<OrganizationSwitcher>` SDK) | 🔴 Critical | XL (1-2 sem) | ❌        | P4    |
| **Multi-session** (multiple accounts in 1 browser + `<UserButton>` style Clerk)                            | 🟠 High     | L (3-5j)     | ❌        | P4    |
| **OAuth GitHub**                                                                                           | 🟠 High     | S (1j)       | ✅ YES    | P4    |
| **OAuth Microsoft**                                                                                        | 🟠 High     | S (1j)       | ✅ YES    | P4    |
| **OAuth Apple**                                                                                            | 🟠 High     | M (2j)       | ⚠️ moyen  | P4    |
| **Email change flow** (avec verification new email)                                                        | 🟡 Medium   | S (1j)       | ✅ YES    | P4    |
| **Avatar upload UI** (file → S3/Cloudinary/local)                                                          | 🟡 Medium   | M (2j)       | ⚠️ moyen  | P4    |

### Phase 5 — Auth modern (~2-3 semaines)

Cible : aligner sur les standards 2026 d'authentification (passwordless + biometric).

| Feature                                           | Impact    | Effort            | Quick win | Phase |
| ------------------------------------------------- | --------- | ----------------- | --------- | ----- |
| **Magic Link** (passwordless email login)         | 🟠 High   | M (2-3j)          | ⚠️ moyen  | P5    |
| **Passkey / WebAuthn** (biometric/hardware key)   | 🟠 High   | L (5j)            | ❌        | P5    |
| **Phone/SMS auth** (Twilio/AWS SNS integration)   | 🟡 Medium | L (4j)            | ❌        | P5    |
| **2FA SMS** (en plus TOTP)                        | 🟡 Medium | M (2j post-Phone) | ❌        | P5    |
| **Trusted devices** (remember device 30j)         | 🟡 Medium | M (2j)            | ⚠️ moyen  | P5    |
| **GDPR data export UI** (download user data JSON) | 🟢 Low    | S (1j)            | ✅ YES    | P5    |

### Phase 6 — Enterprise (~4-6 semaines)

Cible : Enterprise tier (SSO + compliance).

| Feature                                                | Impact                   | Effort               | Quick win | Phase |
| ------------------------------------------------------ | ------------------------ | -------------------- | --------- | ----- |
| **SAML SSO** (per-tenant config + IdP integration)     | 🔴 Critical (Enterprise) | XL (2 sem)           | ❌        | P6    |
| **Backend SDK Go**                                     | 🟡 Medium                | L (1 sem)            | ❌        | P6    |
| **Backend SDK Python**                                 | 🟡 Medium                | L (1 sem)            | ❌        | P6    |
| **Compliance SOC 2 audit** (process externe)           | 🔴 Critical (Enterprise) | XXL (6 mois + $30k+) | ❌        | P6    |
| **Allowlist/Blocklist** (email patterns, domains, IPs) | 🟡 Medium                | M (2j)               | ⚠️ moyen  | P6    |
| **User impersonation tool** (admin debug)              | 🟡 Medium                | M (2j)               | ⚠️ moyen  | P6    |

### Phase 7 — Polish UX/DX (~2 semaines)

Cible : finir l'expérience dev + customisation pour rivaliser DX-wise.

| Feature                                                          | Impact    | Effort        | Quick win | Phase |
| ---------------------------------------------------------------- | --------- | ------------- | --------- | ----- |
| **Email templates UI customizer** (Mjml/React-Email)             | 🟡 Medium | L (4j)        | ❌        | P7    |
| **SMS templates UI**                                             | 🟢 Low    | M (2j)        | ❌        | P7    |
| **JWT templates customizables**                                  | 🟡 Medium | M (2j)        | ⚠️ moyen  | P7    |
| **Bot protection** (Cloudflare Turnstile / hCaptcha integration) | 🟡 Medium | S (1j)        | ✅ YES    | P7    |
| **Localization 40+ langues** (i18n keys + community PRs)         | 🟢 Low    | XL (continue) | ❌        | P7    |
| **Consent banner / Cookie management** (GDPR widget)             | 🟢 Low    | S (1j)        | ✅ YES    | P7    |
| **Account linking auto** (merge OAuth + email same address)      | 🟡 Medium | M (3j)        | ⚠️ moyen  | P7    |
| **Webhook events étendus** (20+ event types)                     | 🟡 Medium | M (3j)        | ❌        | P7    |
| **Theming UI customizer dashboard** (au-delà primary color)      | 🟢 Low    | L (5j)        | ❌        | P7    |

---

## 📋 Tableau priorisé global (sort impact desc + quick wins first)

### 🔥 Top 10 actions à faire en priorité

| #   | Feature                        | Impact      | Effort | Quick win | Phase |
| --- | ------------------------------ | ----------- | ------ | --------- | ----- |
| 1   | **Organizations / Teams**      | 🔴 Critical | XL     | ❌        | P4    |
| 2   | **OAuth GitHub**               | 🟠 High     | S      | ✅        | P4    |
| 3   | **OAuth Microsoft**            | 🟠 High     | S      | ✅        | P4    |
| 4   | **Email change flow**          | 🟡 Medium   | S      | ✅        | P4    |
| 5   | **Bot protection (Turnstile)** | 🟡 Medium   | S      | ✅        | P7    |
| 6   | **GDPR data export UI**        | 🟢 Low      | S      | ✅        | P5    |
| 7   | **Consent banner**             | 🟢 Low      | S      | ✅        | P7    |
| 8   | **Multi-session**              | 🟠 High     | L      | ❌        | P4    |
| 9   | **Magic Link**                 | 🟠 High     | M      | ⚠️        | P5    |
| 10  | **Passkey / WebAuthn**         | 🟠 High     | L      | ❌        | P5    |

### 💎 Quick wins (high ROI, low effort) — à faire dès qu'on revient

- ✅ OAuth GitHub (1j → +1 provider top demand)
- ✅ OAuth Microsoft (1j → +1 provider top demand)
- ✅ Email change flow (1j → polish UX critique)
- ✅ Bot protection Turnstile (1j → security upgrade)
- ✅ GDPR data export (1j → compliance EU)
- ✅ Consent banner (1j → compliance + polish)

**Total quick wins** : ~6 jours pour 6 features impactantes.

### 🏗️ Big rocks (high impact, big effort) — planifier sprints dédiés

- ⛏️ Organizations/Teams (1-2 sem) → unlock B2B
- ⛏️ SAML SSO (2 sem) → unlock Enterprise
- ⛏️ Passkey/WebAuthn (5j) → modern auth
- ⛏️ Email templates UI (4j) → DX upgrade
- ⛏️ Backend SDK Go + Python (2 sem) → reach non-Node devs

---

## 📅 Recommandation : quoi faire quand

### Sprint immédiat (post-publish) — 1 semaine

**Quick wins burst** :

- OAuth GitHub + Microsoft + Apple (3-4j)
- Email change flow (1j)
- Bot protection Turnstile (1j)
- GDPR data export + Consent banner (2j)

→ ezauth aura 4 OAuth providers + 4 features compliance/UX en 1 semaine.

### Sprint 2 (mois 2) — 3-4 semaines

**Phase 4 — Organizations/Teams**

- Model + API + UI complete
- `<OrganizationProfile>`, `<OrganizationSwitcher>`, `<OrganizationCreateModal>` SDK
- Invitations email flow
- Roles per-org

→ ezauth devient compétitif pour B2B sérieux.

### Sprint 3 (mois 3) — 2-3 semaines

**Phase 5 — Auth modern**

- Magic Link
- Passkey/WebAuthn
- Multi-session

→ ezauth aligne sur les standards auth modernes.

### Sprint 4 (mois 4-6) — Enterprise prep

**Phase 6 — SAML + compliance**

- SAML SSO (2 sem)
- Lancer audit SOC 2 (process externe 6 mois)
- Backend SDK Go (1 sem) puis Python (1 sem)

→ ezauth peut attaquer Enterprise mid-market.

### Backlog continu (parallel)

**Phase 7 — Polish DX**

- Email templates UI (1 sprint dédié)
- JWT templates customizables
- Webhook events étendus
- Localization 40+ langues (continue, community-driven)

---

## 🎯 Stratégie marketing par phase

| Phase                      | Marketing positioning                                                   | Cible                           |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| Today (publish)            | "Open-source MVP-auth alternative à Clerk, self-hostable, free forever" | Indie devs, startups, hobbyists |
| Post-Sprint 1              | "Drop-in auth avec OAuth multi-provider + compliance built-in"          | Small SaaS B2C                  |
| Post-Sprint 2 (Orgs)       | "Open-source Clerk for B2B SaaS — invitations + teams + roles natifs"   | Mid-market B2B                  |
| Post-Sprint 3 (modern)     | "Modern auth open-source : Passkey, Magic Link, Multi-session"          | Tech-forward startups           |
| Post-Sprint 4 (Enterprise) | "Enterprise-ready open-source auth : SAML, SOC 2, multi-language SDK"   | Enterprise B2B                  |

---

## 🔄 Différenciateurs durables (à preserve dans toute évolution)

ezauth ne doit JAMAIS perdre ces avantages compétitifs :

1. ✅ **Open-source MIT** (vs closed Clerk)
2. ✅ **Self-hostable** (déploiement sur infra du client)
3. ✅ **3-layer SDK** (`core/react/components` modulaire)
4. ✅ **Federated admin pattern** (`<AuthAdminDashboard>` cross-origin embedable)
5. ✅ **Texts prop pattern** (i18n agnostique vs vendor-locked)
6. ✅ **Zéro vendor lock-in** (sortir = juste copier la DB)
7. ✅ **Compatible avec PayProvider** (intégration ezpay native, billing tier 1)

---

## 📚 Références

- [Clerk Documentation](https://clerk.com/docs) — référence feature-set
- [Auth0 Marketplace](https://marketplace.auth0.com) — patterns Enterprise
- [Lucia Auth](https://lucia-auth.com) — concurrent open-source
- [NextAuth.js](https://next-auth.js.org) — concurrent open-source
- `packages/auth-sdk/README.md` — Roadmap sub-set (orienté SDK npm consumer)
- `BACKLOG.md` (root) — backlog monorepo global

---

## 🛠️ Comment contribuer à cette roadmap

Pour ajouter/réorganiser une feature :

1. Ajouter ligne dans la phase concernée avec Impact / Effort / Quick win
2. Si Quick win → considérer pour le prochain sprint
3. Mettre à jour le tableau "Top 10 actions" si l'impact change le ranking
4. Tagger les features done avec ✅ + lien commit/PR
