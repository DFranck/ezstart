# Configuration Claude - @ezstart Monorepo

## Architecture et Bonnes Pratiques

### Principe de Base : Réutilisabilité Maximale
- **TOUJOURS** utiliser/créer des composants agnostiques au maximum
- **PRIORITÉ** aux packages partagés du monorepo avant toute création spécifique

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