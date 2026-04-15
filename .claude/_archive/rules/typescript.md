## 🏗️ TypeScript - Architecture et Configuration

### 1. Compilation Centralisée avec `tsc -b`

**UN SEUL processus TypeScript pour TOUT le monorepo.**

✅ **Configuration obligatoire :**

- `tsc -b --watch` à la racine uniquement
- `composite: true` dans TOUS les tsconfig
- References vers packages dépendants

❌ **JAMAIS :**

- `tsc --watch` dans les scripts dev des packages
- Duplication de processus TypeScript
- Compilation indépendante

**Scripts optimisés (root package.json) :**

```json
{
  "dev:types": "tsc -b --watch",
  "dev": "turbo dev --concurrency 50"
}
```

**Résultat :** 1 processus TypeScript au lieu de 22+

### 2. Configs TypeScript Centralisées

**TOUJOURS** utiliser `@ezstart/typescript-config` :

```json
{
  "extends": "@ezstart/typescript-config/[variante].json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Variantes disponibles :**

- `base.json` - Configuration de base (packages simples)
- `api.json` - Configuration API (Express)
- `nextjs.json` - Configuration Next.js
- `library.json` - Configuration bibliothèque générique
- `react-library.json` - Configuration React library
- `types.json` - Configuration types uniquement

### 3. Target Uniforme

✅ **ES2022** pour TOUT le monorepo (Node.js LTS 20.18.x)

---

## 🔧 Configuration Centralisée

### Principe : JAMAIS de Config Locale Sans Raison

**Ordre de priorité STRICT :**

1. ✅ **Vérifier config centralisée existante**
   - `@ezstart/typescript-config` (6 variantes)
   - `@ezstart/eslint-config` (3 variantes)
   - `@ezstart/tailwind-config`
   - `@ezstart/next-config`
   - `@ezstart/config` (URLs, ports, CORS)

2. ✅ **Créer config centralisée si réutilisable**
   - Utilisé par 2+ projets → package centralisé
   - Pattern commun → variante dans package existant

3. ⚠️ **Config locale EN DERNIER RECOURS**
   - Vraiment spécifique au projet
   - Documenté dans README du projet

### Packages de Configuration

| Package                      | Usage                | Variantes                                                      |
| ---------------------------- | -------------------- | -------------------------------------------------------------- |
| `@ezstart/config`            | URLs, ports, CORS    | Env-aware (local/dev/prod)                                     |
| `@ezstart/typescript-config` | TypeScript           | 6 variantes (base, api, nextjs, library, react-library, types) |
| `@ezstart/eslint-config`     | ESLint               | 3 variantes (base, next-js, react-internal)                    |
| `@ezstart/tailwind-config`   | Tailwind CSS         | base.js                                                        |
| `@ezstart/next-config`       | Next.js              | Config partagée                                                |
| `@ezstart/ui`                | PostCSS, CSS globals | postcss.config, globals.css                                    |
| `@ezstart/express-core`      | Express + MongoDB    | Infrastructure API                                             |
| `@ezstart/next-theme`        | Theme provider       | Dark/light mode                                                |

### Propagation Automatique

✨ **Toute modification dans un package de config se propage automatiquement à TOUS les projets.**

**Exemple :**

1. Modifier règle ESLint dans `@ezstart/eslint-config`
2. Rebuild le package (`pnpm --filter @ezstart/eslint-config build`)
3. Tous les projets ont la nouvelle règle instantanément ✅
