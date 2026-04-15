## 🧪 Tests et Qualité

### Commandes de Vérification

```bash
# TypeCheck complet (18/18 packages)
pnpm typecheck

# Lint complet (17/17 packages avec code)
pnpm lint

# Build complet
pnpm build

# Vérifier un package spécifique
pnpm --filter @ezstart/[package] typecheck
pnpm --filter @ezstart/[package] lint
pnpm --filter @ezstart/[package] build
```

### Standards de Qualité

✅ **Avant chaque commit :**

- TypeCheck sans erreurs
- Lint warnings acceptables (pas de blockers)
- Build réussi pour packages modifiés

✅ **Avant chaque push :**

- Tous les packages buildent
- Documentation à jour
- Tests passent (si applicable)
