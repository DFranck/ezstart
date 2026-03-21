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

### Si les règles ne sont pas respectées :

L'utilisateur peut dire : **"relis les règles CLAUDE.md"** → Claude relit et corrige immédiatement son comportement.

### Init nouveau workspace :

Quand l'utilisateur dit **"init ce workspace"** sur un nouveau projet avec seulement CLAUDE.md :

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

- 📋 **[BACKLOG.md](./BACKLOG.md)** — Projets en cours — "continue [projet]" pour reprendre
- 📐 **[DEV-RULES.md](./DEV-RULES.md)** — Règles de développement obligatoires
- 🚀 **[DEPLOY.md](./DEPLOY.md)** — Guide de déploiement (Railway/Vercel)
- 📦 [packages/ui/README.md](./packages/ui/README.md) — Composants UI
- 🗄️ [packages/express-core/MONGODB-ARCHITECTURE.md](./packages/express-core/MONGODB-ARCHITECTURE.md) — MongoDB
- 🔐 [packages/auth-sdk/HTTPONLY-MIGRATION.md](./packages/auth-sdk/HTTPONLY-MIGRATION.md) — Auth SDK
- 🎮 [apps/tower-defense/docs/GAMEPLAY.md](./apps/tower-defense/docs/GAMEPLAY.md) — Tower Defense
- 🌿 [apps/green-pulse/FORMS.md](./apps/green-pulse/FORMS.md) — GreenPulse Forms
- 🔀 [apps/green-pulse/api/docs/ROUTING-PATTERN.md](./apps/green-pulse/api/docs/ROUTING-PATTERN.md) — Action-based routing reference

---

## ⚡ Quick Start

```bash
pnpm install

# Terminal 1 (TOUJOURS) : TypeScript centralisé
pnpm dev:types

# Terminal 2 : Lancer l'app ciblée
pnpm dev:ez     # EZStart
pnpm dev:bill   # EZBill + EZAuth
pnpm dev:td     # Tower Defense + EZAuth
pnpm dev:gp     # GreenPulse + EZAuth
pnpm dev:pay    # EZPay
pnpm dev:fs     # FengShui + EZAuth + EZPay
pnpm dev:asc    # ASC-TCD
pnpm dev:all    # TOUT (rarement nécessaire)
```

### Ports

| Service           | API  | Web  |
| ----------------- | ---- | ---- |
| **EZStart**       | 5000 | 5005 |
| **EZAuth**        | 5010 | 5015 |
| **EZBill**        | 5020 | 5025 |
| **Tower Defense** | 5030 | 5035 |
| **EZPay**         | 5040 | 5045 |
| **ASC-TCD**       | —    | 5055 |
| **FengShui**      | —    | 5065 |
| **GreenPulse**    | 5070 | 5075 |

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
│   ├── tower-defense/    # Game
│   ├── green-pulse/      # AI Forms
│   ├── fengshui/         # Feng Shui Analysis
│   └── asc-tcd/          # Association Website
│
└── BACKLOG.md             # Projets en cours
```

---

## 🚀 Déploiement

**APIs → Railway** | **Web → Vercel**

| API | URL |
|-----|-----|
| EZAuth | https://ezauth-api.up.railway.app |
| EZPay | https://ezpay-api.up.railway.app |
| EZBill | https://ezbill-api.up.railway.app |
| GreenPulse | https://greenpulse-api.up.railway.app |
| EZStart | https://ezstart-api.up.railway.app |

**Web** : https://www.ezstart.xyz + sous-domaines Vercel
