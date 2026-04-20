# Standard — le seul checklist

**Source de vérité unique.** Toute mission (feature, fix, refactor, nouveau package, audit) passe ce checklist. Si un point échoue, on boucle `dev → auditor` jusqu'à ce qu'il passe. Pas d'exception.

---

## 0. Hiérarchie de décision (avant toute ligne de code)

**Ordre obligatoire**, valable pour TOUT ce qu'on veut produire (type, util, composant, hook, API, SDK) :

1. **REUSE FIRST** — Grep dans `packages/` pour voir si ça existe déjà :
   - Type/interface → `packages/types`
   - Util générique → `packages/utils`
   - Composant UI → `packages/ui/components`
   - Hook → `packages/ui/hooks`, `packages/ai-sdk/client/hooks`, `packages/auth-sdk`
   - HTTP client → `@ezstart/api-sdk`
   - Wire contract (envelope, error, pagination) → `@ezstart/api-contracts`
   - Env/URL → `@ezstart/config`
   - Logger → `@ezstart/logger`
   - Server framework → `@ezstart/api-core`

   Si ça existe → `import`, jamais réimplémenter.

2. **LEAST-PRIMITIVE WINS** — Toujours le composant le PLUS abstrait disponible :

   | Besoin                   | ✅ Usage obligatoire                        | ❌ Interdit                                      |
   | ------------------------ | ------------------------------------------- | ------------------------------------------------ |
   | Modal classique          | `<Modal>` (`@ezstart/ui`)                   | `<Dialog>` direct                                |
   | Confirmation destructive | `<AlertDialog>`                             | `<Dialog>` ad-hoc, `window.confirm()`, `alert()` |
   | Notification             | `toast.success/error` (sonner)              | `<Alert>` monté ad-hoc                           |
   | Input texte              | `<Input>`, `<Textarea>`                     | `<input>`/`<textarea>` natif                     |
   | Typographie              | `<H1>..<H6>`, `<P>`, `<Span>`               | `<h1>`/`<p>`/`<span>` natif                      |
   | HTTP call                | `apiCall()` ou `apiQuery(app).useX()`       | `fetch()` direct                                 |
   | APIs tierces             | `fetchExternal()`                           | `fetch()` direct                                 |
   | Theme color              | `bg-primary`, `text-foreground`             | OKLCH/hex hardcodé                               |
   | Error parsing            | `parseApiError()` + `ApiError.isApiError()` | `new Error(response.error)`                      |

**SDK text props rule** :

- ALL user-facing text in SDK components MUST accept a `texts` prop with English defaults
- NEVER hardcode marketing taglines or app-specific strings in SDK components
- The consuming app provides translations via the `texts` prop
- SDK components are i18n-agnostic (no dependency on next-intl or any i18n library)

3. **CRÉER SEULEMENT SI ABSENT** — Si le besoin n'existe NULLE PART :
   - Réutilisable par 2+ projets → créer dans `packages/` (respecter section 1-7 ci-dessous)
   - Vraiment app-specific → `apps/<x>/web/components/` ou `apps/<x>/utils/`
   - Documenter pourquoi le besoin est nouveau

4. **PROMOTE SI PATTERN RÉPÉTÉ** — 3+ apps font X manuellement → extraire en `packages/`. Flagger comme dette technique dans `BACKLOG.md`.

---

## 0bis. Architecture SDK (packages consumer-facing)

Tout package SDK qui expose de la logique client + UI suit le **split 3 couches**. Le consumer choisit son niveau d'intégration :

| Couche            | Contenu                          | Peer deps               | Consumer type                                     |
| ----------------- | -------------------------------- | ----------------------- | ------------------------------------------------- |
| `src/core/`       | Client agnostique, types, errors | aucune (ou `zod`)       | Any JS (Vue, Svelte, vanilla, Node, React Native) |
| `src/react/`      | Provider, hooks, guards          | `react`                 | React — construit son propre UI                   |
| `src/components/` | Composants pré-faits             | `react` + `@ezstart/ui` | React — drop-in zero effort                       |

**`package.json` exports** (3 entry points) :

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./core": { "types": "./dist/core/index.d.ts", "import": "./dist/core/index.js" },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.js"
    }
  }
}
```

- `"."` → re-exporte core + react + components (import par défaut, nécessite `@ezstart/ui`)
- `"./core"` → core seul (usage standalone non-React, zéro peer dep UI)
- `"./components"` → composants UI seuls (opt-in, nécessite `@ezstart/ui`)

**Règles d'import entre couches** (sens unique, jamais remonter) :

```
core/  ←  react/  ←  components/
```

- `core/` n'importe JAMAIS depuis `react/`, `components/`, ni `@ezstart/*`
- `react/` importe depuis `core/` uniquement, jamais depuis `components/`
- `components/` importe depuis `core/` et `react/`, utilise `@ezstart/ui`

> **Deprecated — monorepo wrapper `ezstart-<name>.ts`** : le pattern d'un wrapper qui pré-câble le core avec `@ezstart/config`/`@ezstart/api-sdk` est **supprimé**. Le consumer (qu'il soit interne au monorepo ou externe) passe toujours `apiUrl` explicitement à `create<Name>Client({ apiUrl, appName })`. Zéro magie monorepo, un setup canonique partout.

**Core factory pattern** :

```ts
// src/core/auth-client.ts
export function createAuthClient(config: AuthClientConfig) {
  // zero framework, zero @ezstart/*
  return { login, logout, refresh, getUser, onTokenChange }
}
```

**Packages concernés** : `auth-sdk`, `pay-sdk`, `ai-sdk`, tout futur SDK client.
**Packages NON concernés** : `api-core` (serveur, pas de React), `api-contracts` (types purs), `config`, `logger`.

---

## 1. Agnostique

Le **core** de tout package doit être 100% agnostique monorepo, publishable npm standalone.

**Check** :

```bash
# Dans packages/<name>/src/core/ (ou src/ si pas de séparation core/wrapper)
grep -rE "@ezstart/(config|logger)|ezauth-storage|getApiUrl|getWebUrl" packages/<name>/src/core
# → zéro match attendu (sauf dans un commentaire "No coupling to...")
```

**Pattern** : `src/core/` agnostique exposant `create<Name>Client({ apiUrl, appName, ... })`. Le consumer passe toujours `apiUrl` explicitement — pas de wrapper monorepo-magique. (Le pattern `src/ezstart-<name>.ts` est deprecated, cf. section 0bis.)

---

## 2. Web-standard / TypeScript strict

**Interdits dans src/** (grep doit retourner zéro) :

```bash
grep -rnE "\bany\b|as unknown|@ts-expect-error|@ts-ignore|console\.(log|warn|error)" packages/<name>/src
```

**Règles** :

- `tsconfig.json` extends `@ezstart/typescript-config/library.json` (ou `nextjs.json` / `api.json` selon contexte)
- `composite: true`, `outDir: ./dist`, `rootDir: ./src`
- Target `ES2022`, `lib` approprié
- Pas de `declare module`, pas de `@ts-expect-error` — si le type est faux, fixer le type
- Logger par défaut silent no-op dans le core (caller opt-in via config)

---

## 3. Pro

- Fonctions < 50 lignes, composants < 300 lignes, fichiers < 400 lignes (extraire sinon)
- Nommage : `PascalCase` components, `camelCase` fn/var, `UPPERCASE` consts, `kebab-case` folders
- Un fichier = une responsabilité
- Exports internes taggés `@internal` en JSDoc
- Pas de variables mortes, pas de code commenté
- Rétro-compat : quand on modifie une surface exportée, documenter la migration

---

## 4. Publishable

`package.json` — **tous** ces champs obligatoires :

```json
{
  "name": "@ezstart/<name>",
  "version": "x.y.z",
  "description": "<one sentence>",
  "sideEffects": false,
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/DFranck/ezstart.git",
    "directory": "packages/<name>"
  },
  "homepage": "https://github.com/DFranck/ezstart/tree/master/packages/<name>",
  "bugs": { "url": "https://github.com/DFranck/ezstart/issues" },
  "keywords": ["<domain>", "ezstart"],
  "author": "EzStart LLC",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "peerDependencies": { "...": "optional via peerDependenciesMeta if possible" }
}
```

Pour les SDK consumer-facing (cf. section 0bis), ajouter les entry points `./core` et `./components` :

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./core": { "types": "./dist/core/index.d.ts", "import": "./dist/core/index.js" },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "import": "./dist/components/index.js"
    }
  }
}
```

**Check** :

```bash
for key in sideEffects license repository homepage bugs keywords author type exports files; do
  grep -c "\"$key\"" packages/<name>/package.json > /dev/null && echo "✓ $key" || echo "✗ MISSING $key"
done
```

---

## 5. Fully tested

- **Vitest** obligatoire (Jest toléré pour compat legacy mais à migrer)
- `vitest.config.ts` force `NODE_ENV=test` (respect `.claude/rules/data-protection.md` — jamais de vraie DB)
- Couverture des edge cases par domaine :
  - **HTTP client** : 401 refresh, 429 retryAfter, AbortSignal, FormData, custom Content-Type, network error, responseType variants, envelope unwrap, `{ success: false }` throw
  - **Auth** : flow login, refresh expiré, localStorage corrompu, 2FA
  - **UI hook** : valeurs initiales, cleanup, race conditions sur unmount
  - **Schema validation** : bornes min/max, coerce, unknown keys, types nested
  - **SDK core** : factory create, config validation, token lifecycle, error handling
  - **SDK react** : Provider mount/unmount, hook state transitions, context propagation
  - **SDK components** : render, user interaction, loading/error states
- Tests core-agnostic indépendants des tests react/components/wrapper
- Aucun test flaky toléré

---

## 6. Documenté (succinct mais complet)

`README.md` structure **obligatoire** :

```markdown
# @ezstart/<name>

<one-sentence purpose>

## Install

## Quickstart — React with components (SDK avec `components/`)

## Quickstart — React hooks only (SDK avec `react/`)

## Quickstart — Core only (SDK avec `core/`)

## API

### <primitive1>

### <primitive2>

...

## Migration from @ezstart/<old> (si remplacement)

## Related
```

**Règles** :

- Les quickstarts sont organisés par **niveau d'intégration** (components > hooks > core), PAS par contexte de setup (monorepo vs standalone). Un SDK publishable doit s'utiliser à l'identique partout — `apiUrl` est TOUJOURS explicite dans les exemples, aucune magie monorepo.
- Tous les `@example` en JSDoc utilisent `'myapp'` (générique) et des URLs explicites type `'https://api.example.com'`. Zéro nom réel du monorepo (`green-pulse`, `ezbill`, etc.), zéro `localhost`, zéro auto-résolution via `@ezstart/config`.
- Pas de pavé marketing, pas d'emojis décoratifs ✨, pas de "Why" qui raconte l'histoire
- Chaque export public documenté avec 1 phrase + `@example`
- Exemples qui compilent (pas de pseudo-code)

**Check** :

```bash
for h in "## Install" "## Quickstart" "## API" "Migration" "Related"; do
  grep -c "$h" packages/<name>/README.md > /dev/null && echo "✓ $h" || echo "✗ $h"
done
```

---

## 7. Linté

Chaque package sensible a sa propre règle ESLint custom dans `packages/eslint-plugin-ezstart/src/rules/<name>.ts` qui bloque :

- Imports d'API deprecated (ex: `@ezstart/fetch-client` après migration)
- Bypass du pattern standard (ex: `fetch(` direct hors `fetchExternal`)
- Violations de least-primitive (ex: `Dialog` hors `packages/ui/`, `alert()`/`confirm()` hors tests)
- Erreurs non-parsées (`throw new Error(response.error)` sans `parseApiError`)

Règle activée en `error` → bloque commit (husky) + CI. Autofix quand possible.

---

## Grep-commands prêts à l'emploi (audit rapide)

```bash
# Agnosticité core (zero @ezstart/*, zero React)
grep -rnE "@ezstart/(config|logger)|ezauth-storage|getApiUrl" packages/<name>/src/core

# SDK layer isolation (core/ must not import react/ or components/)
grep -rnE "from '\.\./react|from '\.\./components|from 'react'" packages/<name>/src/core

# TypeScript strict
grep -rnE "\bany\b|as unknown|@ts-expect-error|@ts-ignore" packages/<name>/src

# Console
grep -rnE "console\.(log|warn|error)" packages/<name>/src

# Real app names (doivent être absents des packages agnostiques)
grep -rnE "'(ezstart|ezauth|ezbill|ezpay|fengshui|asc-tcd|gacha-analyzer|green-pulse)'" packages/<name>/src/core

# package.json publish-ready
for key in sideEffects license repository homepage bugs keywords author type exports files; do
  grep -c "\"$key\"" packages/<name>/package.json > /dev/null && echo "✓ $key" || echo "✗ $key"
done

# README structure
for h in "## Install" "## Quickstart" "## API" "Migration" "Related"; do
  grep -c "$h" packages/<name>/README.md > /dev/null && echo "✓ $h" || echo "✗ $h"
done

# Global validation
pnpm typecheck
pnpm --filter @ezstart/<name> test
pnpm --filter @ezstart/<name> build
```
