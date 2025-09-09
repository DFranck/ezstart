# Configuration Claude - @ezstart Monorepo

## Architecture et Bonnes Pratiques

### Principe de Base : Réutilisabilité Maximale
- **TOUJOURS** utiliser/créer des composants agnostiques au maximum
- **PRIORITÉ** aux packages partagés du monorepo avant toute création spécifique

### Bonnes Pratiques UI/UX
- **JAMAIS** utiliser des balises HTML natives (`<input>`, `<button>`, `<label>`) 
- **TOUJOURS** utiliser les composants du package `@ezstart/ui/components` (Input, Button, Label, Card, etc.)
- **JAMAIS** utiliser des couleurs hardcodées (`bg-red-50`, `text-gray-600`)
- **TOUJOURS** utiliser des classes sémantiques (`bg-destructive/15`, `text-muted-foreground`, `text-primary`)
- **TOUJOURS** laisser les composants gérer leurs propres styles et couleurs

### Structure Monorepo
```
@ezstart/
├── packages/           # Packages partagés entre tous les projets
│   ├── types/         # Types TypeScript communs
│   ├── utils/         # Utilitaires partagés
│   ├── config/        # Configurations communes
│   └── ...
├── apps/
│   ├── ez-billing/
│   │   ├── web/       # Frontend Next.js
│   │   ├── api/       # Backend API
│   │   ├── types/     # Types spécifiques au projet (mais partagés web/api)
│   │   ├── utils/     # Utils spécifiques au projet (mais partagés web/api)
│   │   ├── config/    # Config spécifique au projet (mais partagée web/api)
│   │   └── ...
│   └── tower-defense/
│       ├── web/
│       ├── api/
│       ├── types/     # Types spécifiques TD mais partagés web/api
│       ├── utils/
│       ├── config/
│       └── ...
```

### Règles de Développement

#### 1. Hiérarchie des Packages
1. **packages/** - Pour tout ce qui peut être réutilisé entre projets
2. **apps/[project]/[shared]** - Pour ce qui est spécifique au projet mais partagé entre web/api
3. **apps/[project]/web|api** - Seulement pour ce qui est vraiment spécifique à une couche

#### 2. Avant de Créer Quoi Que Ce Soit
- Vérifier si existe dans `packages/`
- Vérifier si peut être généralisé pour `packages/`
- Si spécifique au projet : vérifier si partageable entre web/api
- Créer dans la couche la plus haute possible

#### 3. Exemples Concrets
- Types d'entités → `packages/types` ou `apps/[project]/types`
- Utilitaires de validation → `packages/utils`
- Configs API communes → `packages/config`
- Types spécifiques EZ-Billing → `apps/ez-billing/types`
- Composants UI réutilisables → `packages/ui` (si existe)

## Configuration Standardisée - Maximum de Réutilisabilité ✅

### Apps Web - Configuration 100% Centralisée
Toutes les apps web (`ezauth/web`, `ez-billing/web`, `fengshui/web`, etc.) utilisent **exactement** la même configuration :

- **Tailwind Config** : `tailwind.config.js` → `@workspace/tailwind-config/base.js`
- **PostCSS Config** : `postcss.config.mjs` → `@ezstart/ui/postcss.config`
- **ESLint Config** : `eslint.config.js` → `@workspace/eslint-config/next-js`
- **CSS Globals** : `@import "@ezstart/ui/globals.css"`
- **Scripts standardisés** : `lint`, `lint:fix`, `typecheck`
- **Dépendances** : `"@ezstart/ui": "workspace:*"`

### APIs - Configuration 100% Centralisée
Toutes les APIs (`ezauth/api`, `ez-billing/api`, `monitor/api`, etc.) utilisent **exactement** la même configuration :

- **TypeScript Config** : `tsconfig.json` → `@workspace/typescript-config/api.json`
- **Base commune** : `@ezstart/api-core` pour infrastructure partagée
- **Structure standardisée** : `outDir: "dist"`, `rootDir: "."`, includes/excludes identiques
- **Types harmonisés** : `["node"]` + `["jest"]` selon les projets avec tests

### Packages Centralisés de Configuration
- `@workspace/tailwind-config` - Configs Tailwind partagées
- `@workspace/eslint-config` - Règles ESLint partagées  
- `@workspace/typescript-config` - Configs TypeScript partagées
- `@ezstart/ui` - Composants, styles et configs CSS/PostCSS
- `@ezstart/api-core` - Infrastructure API partagée

### Propagation Automatique des Changements
✨ **Toute modification** dans les packages centralisés se propage **automatiquement** à tous les projets. Une seule source de vérité pour l'ensemble du monorepo !

### Commandes Importantes
- Build : `pnpm build`
- TypeCheck : `pnpm typecheck` 
- Lint : `pnpm lint`
- Tests : vérifier dans chaque projet (pas de standard défini)

### Git Commits
- **NE JAMAIS** ajouter les lignes suivantes dans les commits :
  - `🤖 Generated with [Claude Code](https://claude.ai/code)`
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
- Faire des messages de commit simples et professionnels

### Notes Techniques
- Monorepo utilise pnpm workspaces
- TypeScript avec configurations partagées
- Architecture microservices avec packages partagés

## EZAuth - Système d'Authentification Centralisé

### Architecture
- **Service API** : `apps/ezauth/api` - Service standalone sur port 8001
- **Client SDK** : `packages/auth-sdk` - Package réutilisable avec React hooks
- **Base de données** : MongoDB partagée avec collections séparées (`auth_users`, `auth_codes`)

### Flow OAuth2
1. **Redirect** → EZAuth service (`/login?app=ez-billing&redirect_uri=...`)
2. **Auth** → Utilisateur se connecte/enregistre
3. **Callback** → Retour avec code d'autorisation (`/auth/callback?code=...`)
4. **Exchange** → Code → JWT token (7 jours)
5. **SSO** → Token valide sur toutes les apps

### Intégration dans les Apps
```tsx
// 1. Ajouter dépendance
"@ezstart/auth-sdk": "workspace:*"

// 2. Setup client
import { AuthProvider, AuthClient } from '@ezstart/auth-sdk'
const authClient = new AuthClient({
  baseURL: 'http://localhost:8001/api/auth',
  appName: 'ez-billing', // ou 'tower-defense'
  redirectUri: 'http://localhost:3000/auth/callback'
})

// 3. Provider
<AuthProvider client={authClient}>
  <App />
</AuthProvider>

// 4. Hooks
import { useAuth, useUser } from '@ezstart/auth-sdk'
const { user, isAuthenticated, login, logout } = useAuth()
```

### Endpoints API
- `GET /health` - Health check
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/token` - Échange code → token
- `GET /api/auth/me` - Info utilisateur (protégé)
- `POST /api/auth/verify` - Validation token

### Migration depuis système actuel
1. **Remplacer** AuthProvider actuel par EZAuth
2. **Créer** page `/auth/callback` dans chaque app
3. **Single Sign-On** automatique entre toutes les apps

