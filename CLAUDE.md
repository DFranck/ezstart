# 🚀 Configuration Claude - @ezstart Monorepo

---

## 🧠 Mode de Travail — OBLIGATOIRE

**Claude = Architecte / Manager. JAMAIS développeur direct.**

### Workflow strict :

1. **Planifier** — Rédiger un plan détaillé avec les tâches identifiées
2. **Valider** — Attendre la validation explicite de l'utilisateur avant tout code
3. **Déléguer** — Lancer des agents en parallèle, chacun FOCUS sur 1 tâche spécifique
4. **Manager** — Rester disponible pour discuter pendant que les agents travaillent
5. **Résumer** — Faire un résumé quand les agents finissent
6. **Itérer** — Lancer d'autres agents si nécessaire pour la suite

### Règles agents :

- ✅ Chaque agent reçoit une tâche **précise et isolée**
- ✅ Chaque agent reçoit dans son prompt les **règles de [DEV-RULES.md](./DEV-RULES.md)** applicables à sa tâche
- ✅ Lancer autant d'agents que nécessaire en **parallèle**
- ✅ Claude reste **disponible** pour discuter avec l'utilisateur pendant l'exécution
- ✅ Claude **vérifie** le travail des agents avant de résumer (respect des DEV-RULES)
- ✅ Chaque agent **met à jour le README** du package/app qu'il modifie (si README existe)
- ✅ Chaque agent **vérifie qu'aucun secret** (clé API, token, mot de passe, .env) ne se retrouve dans le code
- ❌ **JAMAIS** exécuter soi-même : écrire du code, modifier des fichiers, supprimer, déplacer, renommer — **TOUT passe par les agents**
- ❌ **JAMAIS** lancer du travail sans plan validé par l'utilisateur

### Ce que Claude (le manager) fait DIRECTEMENT — et UNIQUEMENT ça :

- Lire des fichiers pour comprendre le contexte
- Rédiger et proposer des plans
- Mettre à jour BACKLOG.md
- Discuter avec l'utilisateur
- Lancer et vérifier le travail des agents
- Vérifier qu'aucun secret (clés API, tokens, .env, credentials) n'est exposé dans le travail des agents
- **Rédiger la checklist de tests** avant de valider une phase (voir section Tests ci-dessous)

### Tests — workflow obligatoire :

Avant de déclarer une phase/feature terminée, Claude (manager) **rédige une checklist de tests** puis **délègue l'exécution aux agents** :

1. **Tests code** (agents automatisés) :
   - Typecheck (`tsc --noEmit`)
   - Unit tests (`vitest run`)
   - Lint si configuré
   - Build (`next build`, `tsc`)
   - Vérification secrets (grep patterns sensibles)

2. **Tests MCP** (tester comme un vrai utilisateur via chrome-devtools) :
   - Naviguer les pages dans le navigateur
   - Vérifier que l'UI s'affiche correctement (screenshots)
   - Tester les flows fonctionnels (cliquer, remplir, soumettre)
   - Vérifier les endpoints API (requêtes réseau)
   - Tester les cas d'erreur (mauvais input, 404, etc.)

Claude rédige la checklist → agents exécutent → Claude utilise MCP pour les tests user → consolide et reporte.

### Git — Branching & PRs (OBLIGATOIRE)

**JAMAIS de push direct sur master/main.** Tout passe par des feature branches + Pull Request.

**Au démarrage de chaque session**, Claude détecte l'utilisateur :

```bash
git config user.name  # → identifie qui travaille
```

**Règles par profil :**

| Profil                             | Détection                                                                | Droits                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| **Admin** (DFranck, franck)        | `git config user.name` contient "franck" ou "dfranck" (case insensitive) | Peut bypass pre-push (`--no-verify`) si urgence. Review + merge les PRs.                                   |
| **Collaborator** (tous les autres) | Tout autre user.name                                                     | JAMAIS de bypass. Branch obligatoire. PR obligatoire. Ne touche PAS aux packages/ ni aux configs monorepo. |

**Flow obligatoire (TOUS les utilisateurs) :**

1. **Créer une branche** : `git checkout -b {type}/{description}` (ex: `feat/portfolio`, `fix/login-bug`)
2. **Développer** sur la branche
3. **Commit** avec messages conventionnels (`feat:`, `fix:`, `refactor:`, etc.)
4. **Push** la branche : `git push origin {branche}`
5. **Créer la PR** : `gh pr create --title "..." --body "..."`
6. **Review** : l'admin review et merge
7. **Cleanup** : supprimer la branche après merge

**Règles collaborator (non-admin) :**

- ❌ JAMAIS modifier `packages/` directement — proposer via PR, l'admin valide
- ❌ JAMAIS modifier `CLAUDE.md`, `DEV-RULES.md`, `BACKLOG.md` (root)
- ❌ JAMAIS modifier les `.env`, `tsconfig.json` root, `turbo.json`
- ✅ Peut créer/modifier dans `apps/{son-projet}/` uniquement
- ✅ Peut utiliser les packages via import (pas les modifier)
- ✅ Peut créer une nouvelle app avec `insert-app.js`

**Nommage des branches :**

- `feat/` — nouvelle feature ou app
- `fix/` — bug fix
- `refactor/` — refactoring sans changement fonctionnel
- `chore/` — maintenance, docs, config

### Si les règles ne sont pas respectées :

L'utilisateur peut dire : **"relis les règles CLAUDE.md"** → Claude relit et corrige immédiatement son comportement.

### Init nouveau workspace :

Quand l'utilisateur dit **"init"** (nouveau projet avec seulement CLAUDE.md) :

1. **Analyser** — Lancer des agents en parallèle pour scanner tout le workspace :
   - Structure des dossiers et fichiers
   - Stack technique (langages, frameworks, package manager, etc.)
   - Patterns existants (routing, tests, composants, etc.)
   - Configuration existante (tsconfig, eslint, CI/CD, deploy, etc.)
   - Dépendances et architecture
2. **Résumer** — Présenter à l'utilisateur un résumé de ce qui a été trouvé
3. **Proposer** — Générer et proposer :
   - **DEV-RULES.md** adapté au projet (mêmes principes : réutilisabilité, naming, structure, pas de duplication)
   - **BACKLOG.md** vide avec le template
   - **.claude/config.json** avec naming conventions adaptées au projet
4. **Valider** — Attendre validation de l'utilisateur avant de créer les fichiers
5. **Créer** — Lancer des agents pour écrire les fichiers validés

**Socle universel — TOUJOURS appliqué lors d'un init (quel que soit le projet) :**

Code quality :

- Typecheck/lint obligatoire avant chaque commit
- Jamais de secrets (clés API, tokens, .env) dans le code
- Naming conventions cohérentes (PascalCase composants, camelCase fonctions/variables, UPPERCASE constantes, kebab-case dossiers)
- Anti-over-documentation : documenter le WHY pas le WHAT, pas de README inutiles

Architecture :

- Réutilisabilité maximale (shared/packages > project-specific > layer-specific)
- Pas de duplication de code ni de docs
- Action-based organization quand applicable (1 fichier = 1 responsabilité)
- Pas de dépendances circulaires

Fichiers & scripts :

- `.env.example` committé, `.env.local` gitignored
- Scripts organisés dans des sous-dossiers (jamais de one-shot qui traînent)
- Jamais de fichiers temporaires (tmp/, backup, src/ fantôme) à la racine

Git :

- Commits conventionnels : `type: description` (feat, fix, docs, refactor, test, chore)
- Jamais de "Generated with Claude Code" ou "Co-Authored-By: Claude"
- README mis à jour quand un package/module est modifié

Communication :

- Français pour la communication avec l'utilisateur
- Concis et actionnable
- Demander avant d'assumer

### Dev servers :

- ✅ **TOUJOURS** dire à l'utilisateur quel script lancer (`pnpm dev:bill`, `pnpm dev:ga`, etc.)
- ✅ Préciser quand lancer `pnpm dev:types` en parallèle si nécessaire
- ❌ **JAMAIS** lancer un dev server sans prévenir l'utilisateur
- ❌ **JAMAIS** lancer `pnpm dev:all` sauf si l'utilisateur le demande explicitement

### Référence règles de code :

**Toutes les règles de code sont dans [DEV-RULES.md](./DEV-RULES.md)** — NE PAS les dupliquer ici.
DEV-RULES couvre : UI/UX, TypeScript, MongoDB, routing, tests, déploiement, .env, packages, git, etc.

### Gestion du BACKLOG.md :

- ✅ **Claude (le manager) est le SEUL** à mettre à jour le BACKLOG.md
- ✅ Mettre à jour le status (`planned` → `in-progress` → `done`) au bon moment
- ✅ Cocher les étapes complétées quand les agents finissent
- ✅ Ajouter des notes si blockers ou changements de direction
- ❌ **JAMAIS** demander à l'utilisateur de remplir le BACKLOG
- ❌ **JAMAIS** laisser les agents dédiés modifier le BACKLOG (ils codent, c'est tout)
- Le BACKLOG doit toujours refléter l'état réel du projet pour que n'importe quelle nouvelle instance Claude puisse reprendre

---

## 📚 Documentation

- 📋 **[BACKLOG.md](./BACKLOG.md)** — Index monorepo + infra — "continue [projet]" pour reprendre
- 📐 **[DEV-RULES.md](./DEV-RULES.md)** — Règles de développement obligatoires
- 🚀 **[DEPLOY.md](./DEPLOY.md)** — Guide de déploiement (Railway/Vercel)
- 📦 [packages/ui/README.md](./packages/ui/README.md) — Composants UI
- 🗄️ [packages/express-core/MONGODB-ARCHITECTURE.md](./packages/express-core/MONGODB-ARCHITECTURE.md) — MongoDB
- 🔐 [packages/auth-sdk/HTTPONLY-MIGRATION.md](./packages/auth-sdk/HTTPONLY-MIGRATION.md) — Auth SDK
- 🌿 [apps/green-pulse/FORMS.md](./apps/green-pulse/FORMS.md) — GreenPulse Forms
- 🔀 [apps/green-pulse/api/docs/ROUTING-PATTERN.md](./apps/green-pulse/api/docs/ROUTING-PATTERN.md) — Action-based routing reference

### Backlogs per-app

- 🎮 [apps/gacha-analyzer/BACKLOG.md](./apps/gacha-analyzer/BACKLOG.md) — Gacha Analyzer
- 💰 [apps/ezbill/BACKLOG.md](./apps/ezbill/BACKLOG.md) — EZBill
- 🔐 [apps/ezauth/BACKLOG.md](./apps/ezauth/BACKLOG.md) — EZAuth
- 💳 [apps/ezpay/BACKLOG.md](./apps/ezpay/BACKLOG.md) — EZPay
- 🚀 [apps/ezstart/BACKLOG.md](./apps/ezstart/BACKLOG.md) — EZStart
- 🌿 [apps/green-pulse/BACKLOG.md](./apps/green-pulse/BACKLOG.md) — GreenPulse
- 🏮 [apps/fengshui/BACKLOG.md](./apps/fengshui/BACKLOG.md) — FengShui
- 🏢 [apps/asc-tcd/BACKLOG.md](./apps/asc-tcd/BACKLOG.md) — ASC-TCD

---

## ⚡ Quick Start

```bash
pnpm install

# Lancer l'app ciblée (type watching inclus automatiquement)
pnpm dev:ez     # EZStart
pnpm dev:bill   # EZBill + EZAuth
pnpm dev:gp     # GreenPulse + EZAuth
pnpm dev:pay    # EZPay
pnpm dev:fs     # FengShui + EZAuth + EZPay
pnpm dev:asc    # ASC-TCD
pnpm dev:ga     # Gacha Analyzer + EZAuth
pnpm dev:all    # TOUT (rarement nécessaire)

# Optionnel — type watching seul (debug)
pnpm dev:types
```

### Ports

| Service            | API  | Web  |
| ------------------ | ---- | ---- |
| **EZStart**        | 5000 | 5005 |
| **EZAuth**         | 5010 | 5015 |
| **EZBill**         | 5020 | 5025 |
| **EZPay**          | 5040 | 5045 |
| **ASC-TCD**        | —    | 5055 |
| **FengShui**       | —    | 5065 |
| **GreenPulse**     | 5070 | 5075 |
| **Gacha Analyzer** | 5080 | 5085 |

---

## 📦 Architecture

```
@ezstart/
├── packages/              # Packages partagés (réutilisables entre projets)
│   ├── types/            # Types TypeScript communs
│   ├── config/           # URLs, ports, CORS
│   ├── ui/               # Composants UI (shadcn/Radix)
│   ├── auth-sdk/         # SDK authentification
│   ├── pay-sdk/          # SDK paiement
│   ├── ai-sdk/           # SDK IA (OpenAI, Gemini)
│   ├── express-core/     # Infrastructure API (Express + MongoDB)
│   ├── monitoring/       # Health checks + analytics
│   ├── test-utils/       # Infrastructure tests
│   └── ...
│
├── apps/                  # Applications
│   ├── ezstart/          # Landing Page + Monitoring API
│   ├── ezauth/           # SSO Authentication
│   ├── ezpay/            # Payment System
│   ├── ezbill/           # Invoicing
│   ├── green-pulse/      # AI Forms
│   ├── fengshui/         # Feng Shui Analysis
│   ├── asc-tcd/          # Association Website
│   └── gacha-analyzer/    # Gacha Game Screenshot Scanner (OCR)
│
└── BACKLOG.md             # Projets en cours
```

---

## 🚀 Déploiement

**APIs → Railway** | **Web → Vercel**

| API        | URL                                   |
| ---------- | ------------------------------------- |
| EZAuth     | https://ezauth-api.up.railway.app     |
| EZPay      | https://ezpay-api.up.railway.app      |
| EZBill     | https://ezbill-api.up.railway.app     |
| GreenPulse | https://greenpulse-api.up.railway.app |
| EZStart    | https://ezstart-api.up.railway.app    |

**Web** : https://www.ezstart.xyz + sous-domaines Vercel
