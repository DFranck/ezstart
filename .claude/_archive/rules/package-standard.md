## 📦 Package Standard — Règle de création/refactor

**Chaque nouveau package dans `packages/`, et chaque refactor majeur d'un package existant, DOIT suivre ce standard.** Source de vérité : `@ezstart/api-sdk` (premier package refactoré avec ce standard).

Ce doc est complémentaire de [`packages.md`](./packages.md) qui cadre la consommation côté apps. Ici on cadre la **fabrication** des packages.

---

## 🎯 Principe : core agnostique + wrapper monorepo

Tout package qui a du comportement configurable (HTTP client, auth flow, theme, provider abstraction, etc.) doit être architecturé en **2 couches** :

```
packages/<name>/
├── src/
│   ├── core/                    # 🌍 100% agnostique, publishable npm
│   │   ├── create-<name>.ts    # Factory: createXxx(config) → { ...bound primitives }
│   │   ├── types.ts             # Types publics (AppName → string, pas d'AppName monorepo)
│   │   ├── internal/            # Helpers privés (non-exportés)
│   │   └── <domain files>.ts    # Logique métier, reçoit config en param
│   ├── ezstart-client.ts        # 🎯 Wrapper pré-configuré pour le monorepo
│   ├── index.ts                 # Exports: bindings (pré-config) + factory + types
│   └── __tests__/               # Tests agnostic + tests wrapper
├── package.json                 # Publish-ready
├── tsconfig.json                # extends @ezstart/typescript-config/library.json
├── vitest.config.ts             # Force NODE_ENV=test (data-protection)
└── README.md
```

**Règle absolue** : grep `@ezstart/config|@ezstart/logger|ezauth|getApiUrl|<monorepo-specific>` dans `src/core/` → **zéro match**. Le seul fichier qui importe les deps monorepo est `ezstart-client.ts` (ou équivalent nommé par domaine).

Packages trop simples (pur types, helpers statelesss) peuvent déroger — ex: `@ezstart/types`, `@ezstart/utils` — à condition qu'ils n'aient AUCUNE config à injecter. Mais s'il y a la moindre logique branchable (URL, auth, DB, logger...), **factory obligatoire**.

---

## 📋 Checklist `package.json` publish-ready

Chaque package respecte **toutes** ces clés :

```json
{
  "name": "@ezstart/<name>",
  "version": "1.0.0",
  "description": "<short purpose>",
  "sideEffects": false,
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/DFranck/ezstart.git",
    "directory": "packages/<name>"
  },
  "homepage": "https://github.com/DFranck/ezstart/tree/master/packages/<name>",
  "bugs": { "url": "https://github.com/DFranck/ezstart/issues" },
  "keywords": ["<domain>", "<stack>", "ezstart"],
  "author": "EzStart LLC",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "dev": "tsc -b --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- `sideEffects: false` → tree-shaking friendly chez les consumers
- `exports` map → éviter `main` legacy, supporte dual types+runtime
- `peerDependencies` avec `peerDependenciesMeta: { "<dep>": { "optional": true } }` pour React/React Query/etc.
- Pas de dépendance runtime lourde : ce qui est optionnel va en peer

---

## 🏗️ Qualité du code (OBLIGATOIRE, zéro exception)

- ❌ **Zéro `any`**, `as unknown`, `@ts-expect-error`, `@ts-ignore`
- ❌ **Zéro `console.log/warn/error`** — la règle `@ezstart/logger` s'applique… sauf dans `src/core/` agnostique où la convention est : logger silent no-op par défaut, caller opt-in via config (comme ky/ofetch/axios)
- ❌ **Zéro HTML natif** dans les composants UI (cf `ui.md`)
- ❌ **Zéro couleur Tailwind hardcodée** — classes sémantiques uniquement
- ❌ **Zéro string user-facing non-traduite** (cf `i18n.md`)
- ✅ **Types stricts** end-to-end, generics bien inférés
- ✅ **Functions < 50 lignes**, composants < 300 lignes, fichiers < 400 lignes (extraire sinon)
- ✅ **Nommage** : PascalCase components, camelCase functions, UPPERCASE constants, kebab-case folders
- ✅ **JSDoc sur tous les exports publics** avec `@example` (exemples **génériques** `'myapp'`, pas de noms d'apps du monorepo)
- ✅ **`@internal` tag** sur les exports internes non destinés aux consumers (ex: helpers dans `core/internal/`)

---

## 🧪 Tests obligatoires

Vitest, dans `src/__tests__/` :

1. **Tests core-agnostic** : prouvent que le factory fonctionne **sans AUCUN lien monorepo**
   - Config custom (baseUrl, tokenStore, refresh, envelope, logger)
   - Couvre les happy paths + edge cases
2. **Tests wrapper** : smoke tests sur la couche pré-configurée (2-3 tests)
3. **Tests par feature** : une suite par primitive publique exportée
4. **Couverture edge cases obligatoires** selon le domaine :
   - HTTP client : 401 refresh, 429 retryAfter, AbortSignal, FormData, custom Content-Type, network error, responseType variantes
   - Auth : flow SSO, localStorage corrompu, refresh expiré
   - UI hooks : valeurs initiales, cleanup, race conditions sur unmount

Config vitest **OBLIGATOIRE** (respect `.claude/rules/data-protection.md`) :

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // ou 'jsdom' pour les hooks React
    env: { NODE_ENV: 'test' },
  },
})
```

Jamais de vraie DB / URL prod dans les tests.

---

## 📖 README obligatoire

Structure standard (court, dense) :

```markdown
# @ezstart/<name>

<one-sentence purpose>

## Install

    pnpm add @ezstart/<name>

## Quickstart (monorepo)

\`\`\`ts
import { <primitive> } from '@ezstart/<name>'
// 2-3 lignes pour l'usage le plus fréquent
\`\`\`

## Quickstart (external / standalone)

\`\`\`ts
import { create<Name> } from '@ezstart/<name>'

const client = create<Name>({
// config agnostique
})
\`\`\`

## API

### `<primitive>()`

<signature + short example>

### `ApiError` / `ApiClient` / etc.

<one paragraph each>

## Migration from @ezstart/<old-package>

| Before         | After          |
| -------------- | -------------- |
| `callApi(...)` | `apiCall(...)` |
| ...            | ...            |

## Related

- [package-standard.md](../../.claude/rules/package-standard.md)
- [other-relevant-package](../other/README.md)
```

Pas de pavé marketing. Pas de "Features ✨" emoji-heavy. Du factuel, des exemples qui compilent.

---

## 🚦 Pipeline de fabrication (8 étapes)

Chaque nouveau package / refactor majeur suit **exactement** ces étapes. Chaque étape = **un commit** vérifié.

### 1. Scaffold (agent)

Agent crée structure + `package.json` publish-ready + `tsconfig` + `vitest.config` + squelette core/wrapper/tests/README.

### 2. Implémentation agnostique (agent)

Core factory + internal helpers + types. Aucun import monorepo. Tests core-agnostic.

### 3. Wrapper monorepo (agent)

`ezstart-client.ts` pré-configuré + tests smoke.

### 4. Publish-ready polish (agent)

`sideEffects`, `license`, `repository`, `keywords`, exports map, JSDoc complet, README.

### 5. Audit ultra-strict (humain ou agent code-quality)

Checklist :

- grep agnosticité core/ → zéro match
- grep `any|as unknown|@ts-expect-error` → zéro
- Tests passent (nombre explicite)
- Typecheck global 39/39 zéro régression
- Build OK
- `package.json` parse JSON valid
- README cover tous les exports publics

### 6. Lint rule dédiée (agent)

Ajoute dans `packages/eslint-plugin-ezstart/src/rules/<name>.ts` une règle qui :

- Bloque les imports de l'ancien package équivalent (si remplacement)
- Force l'usage des primitives pré-configurées
- Détecte les bypass (ex: `fetch()` direct pour api-sdk, `localStorage['ezauth-storage']` raw pour auth-sdk)
- Autofix quand possible

Règle désactivée par défaut, activée en **Phase 8** après migration.

### 7. Migration pilote (agent)

Migration d'**UNE seule app pilote** (généralement green-pulse, la plus riche) :

- Update imports
- Update package.json deps
- Typecheck + build + test E2E MCP
- Commit par la main de Claude (architect) après review manuelle

### 8. Rollout + activation lint (agent)

- Migration de toutes les autres apps + SDKs consommateurs (codemod)
- Delete ancien package (si remplacement)
- Activation règle lint en `error` (bloquante commit + CI)
- Update `packages.md` si le pattern standard change

---

## 🚫 Ce que tu NE peux PAS faire

- ❌ **Renommer le package existant** pour le refactorer. Toujours **créer from-scratch** en parallèle, migrer progressivement, supprimer l'ancien en fin de cycle. Zéro risque de régression.
- ❌ **Sauter la couche core agnostique** en pensant "de toute façon c'est pour le monorepo". La règle est que chaque package soit publishable npm **standalone**. Le wrapper est l'exception, pas la règle.
- ❌ **Skip les tests agnostic** même si le wrapper est couvert. L'agnosticité n'est jamais validée par les tests wrapper.
- ❌ **Omettre la lint rule dédiée**. Sans elle, un futur dev (ou agent) réintroduira l'anti-pattern.
- ❌ **Committer plusieurs étapes du pipeline dans un même commit**. Chaque étape = audit trail clair, rollback ciblé.

---

## 📐 Ordre de refactor du monorepo (référence)

Ordre officiel décidé pour la transition vers ce standard :

1. ✅ `@ezstart/api-sdk` — HTTP client (remplace `fetch-client`)
2. `@ezstart/api-contracts` — shapes wire + Zod schemas + ErrorCode enum (nouveau, pur types + runtime Zod léger)
3. `@ezstart/api-core` — server framework agnostique multi-provider (remplace `express-core`)
4. Contract tests end-to-end api-sdk ↔ api-core
5. `@ezstart/auth-sdk` — factory agnostique + wrapper ezauth
6. `@ezstart/ai-sdk` — factory agnostique + wrapper ezstart
7. `@ezstart/pay-sdk` — wrapper Stripe agnostique
8. Autres packages (`monitoring`, `pdf-sdk`, `capture-sdk`, `ocr-sdk`, `logger`, `utils`, `types`, `config`, `next-theme`) → audit + publish-ready polish
9. `packages/ui` (en dernier, c'est le plus gros)
10. Optionnel : `@ezstart/realtime-sdk` si besoin réel (socket.io)

---

## ✅ Exemple conforme

Le package `@ezstart/api-sdk` (commit initial sur `feat/api-sdk-unification`) est la **référence vivante** de ce standard. Tout nouveau package doit s'en inspirer structurellement (sans copier sa logique métier évidemment).
