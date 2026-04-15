# Role: Full Monorepo Auditor

## Quand utiliser

Quand l'utilisateur dit "audite", "check", "valide", "vérifie" — lancer cet audit COMPLET. Ne PAS demander quoi vérifier. TOUT vérifier.

## Checklist EXHAUSTIVE — TOUT doit être vérifié

### 1. Packages (pour CHAQUE package dans packages/)

- [ ] package.json : name correct (@ezstart/...), version, main/exports, dependencies à jour
- [ ] tsconfig.json : extends correct, composite true, outDir dist
- [ ] README.md : existe, à jour, <30 lignes, suit le template
- [ ] Exports : index.ts exporte tout ce qui est public, pas de re-export cassé
- [ ] Types : pas de `any`, pas d'imports circulaires
- [ ] Build : `pnpm build` passe sans erreur
- [ ] Agnosticité : ZERO référence à une app spécifique
- [ ] Logger : utilise @ezstart/logger, pas console.log
- [ ] Tests : si le package a des tests, ils passent

### 2. APIs (pour CHAQUE app dans apps/\*/api/)

- [ ] Utilise @ezstart/express-core (createApp, startServer)
- [ ] Health endpoint (/health) — automatique via createApp
- [ ] Swagger/OpenAPI (/docs) — registries passées à startServer
- [ ] Auth middleware sur routes destructives (DELETE, PUT, POST sensibles)
- [ ] Rate limiting sur routes sensibles
- [ ] Pagination sur TOUS les GET liste (limit+offset, meta.total)
- [ ] Réponse format : { success, data, meta }
- [ ] Validation Zod sur tous les inputs (body, query, params)
- [ ] Logger : @ezstart/logger/server, pas console.log
- [ ] .env.example : existe avec placeholders (pas de vrais secrets)
- [ ] Pas de secrets hardcodés dans le code
- [ ] CORS configuré via @ezstart/config
- [ ] Graceful shutdown (via express-core startServer)
- [ ] MongoDB via connectToMongo (express-core)

### 3. Frontends (pour CHAQUE app dans apps/\*/web/)

- [ ] callApi wrapper dans src/config/api.ts avec appName
- [ ] React Query : QueryProvider dans providers, useQuery/useMutation partout
- [ ] Toast : sonner configuré dans layout, toast.success/error (pas alert())
- [ ] Composants : @ezstart/ui/components, Tag pour HTML (pas de custom)
- [ ] Styles : CSS variables theme (pas de couleurs Tailwind hardcodées)
- [ ] i18n : next-intl configuré, pas de strings hardcodées
- [ ] Loading states : skeletons/spinners sur tout contenu async
- [ ] Error states : message + retry sur les fetches
- [ ] Empty states : message quand pas de données
- [ ] Auth : @ezstart/auth-sdk intégré
- [ ] Logger : @ezstart/logger (pas console.log)
- [ ] Responsive : fonctionne mobile/tablet/desktop
- [ ] Dark mode : fonctionne (CSS variables OKLCH)

### 4. Infrastructure monorepo

- [ ] pnpm install : passe sans erreur
- [ ] turbo build : tous les packages/apps buildent
- [ ] turbo typecheck : pas d'erreurs nouvelles
- [ ] Tests : tous passent
- [ ] Workspace validator : toutes les apps green
- [ ] tsconfig.json root : toutes les references
- [ ] package.json root : tous les scripts dev:x
- [ ] @ezstart/config urls.ts : toutes les apps enregistrées
- [ ] Husky : pre-commit hook fonctionne
- [ ] CI : .github/workflows/ci.yml existe et correct
- [ ] .gitignore : couvre .env.local, node_modules, dist, .next
- [ ] Per-app BACKLOG.md : existe pour chaque app
- [ ] README.md : existe pour chaque app et package

### 5. Cohérence cross-app

- [ ] Même pattern callApi partout (ou justification si exception)
- [ ] Même pattern React Query partout
- [ ] Même pattern auth middleware partout
- [ ] Même pattern de réponse API partout
- [ ] Pas de code dupliqué entre apps (extraire dans packages)
- [ ] Pas de dépendances circulaires

## Output

Rapport avec :

1. Score global /100
2. Par app : score + problèmes
3. Par package : score + problèmes
4. Actions priorisées (CRITICAL → LOW)
