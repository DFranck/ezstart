# Déploiement API Tower Defense sur Render

## Configuration Render

### Service Type

- **Type** : Web Service
- **Instance** : Free (0.1 CPU, 512 MB)
- **Region** : Oregon (US West)

### Repository

- **URL** : https://github.com/DFranck/ezstart
- **Branch** : master
- **Root Directory** : (vide - utilise la racine du monorepo)

### Build Configuration

```bash
# Build Command
pnpm install --frozen-lockfile && pnpm --filter api-tower-defense build

# Start Command
pnpm --filter api-tower-defense start
```

### Auto-Deploy

- **Trigger** : On Commit (automatique)
- **Service ID** : srv-d0dnr81r0fns739erehg
- **URL** : https://ezstart-api.onrender.com

## Dépendances Monorepo

L'API dépend des packages suivants qui doivent être construits dans cet ordre :

1. `@ezstart/types`
2. `@ezstart/api-core`
3. `@ezstart/ui`
4. `@tower-defense/config`
5. `@tower-defense/types`
6. `@tower-defense/utils`
7. `api-tower-defense`

## Script Prebuild

Le script `prebuild` dans `package.json` gère automatiquement la construction des dépendances :

```json
{
  "prebuild": "pnpm --filter @ezstart/types build && pnpm --filter @ezstart/api-core build && pnpm --filter @ezstart/ui build && pnpm --filter @tower-defense/config build && pnpm --filter @tower-defense/types build && pnpm --filter @tower-defense/utils build"
}
```

## Variables d'Environnement

À configurer dans Render :

- `MONGODB_URI` : URI de connexion MongoDB
- `NODE_ENV` : production

## Troubleshooting

### Erreurs courantes :

1. **Module not found** : Vérifier que tous les packages workspace sont construits
2. **ES Module imports** : Utiliser les extensions `.js` pour les imports relatifs
3. **Port binding** : L'API écoute sur le port 8888

### Logs

- Vérifier les logs Render pour diagnostiquer les problèmes
- Les erreurs de build apparaissent dans les logs de construction
- Les erreurs runtime apparaissent dans les logs de démarrage
