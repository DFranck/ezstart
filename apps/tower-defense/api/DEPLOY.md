# 🚀 Déploiement API Tower Defense sur Render

## 📋 Configuration Render (Meilleure Pratique)

### ⚙️ Paramètres du Service

**Type de Service :** Web Service  
**Instance :** Free (0.1 CPU, 512 MB)  
**Région :** Oregon (US West)

### 🔧 Configuration Build & Deploy

#### Repository

- **URL :** `https://github.com/DFranck/ezstart`
- **Branch :** `master`
- **Credentials :** `franckdufournet@hotmail.fr`

#### ⭐ Configuration Optimale (Recommandée)

```
Root Directory: apps/tower-defense/api
Build Command: pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
```

### 📦 Dépendances Monorepo

L'API dépend des packages workspace suivants (construits dans l'ordre) :

1. `@ezstart/types` - Types communs
2. `@ezstart/express-core` - Core API utilities
3. `@ezstart/ui` - Composants UI
4. `@tower-defense/config` - Configuration du jeu
5. `@tower-defense/types` - Types spécifiques au jeu
6. `@tower-defense/utils` - Utilitaires du jeu

### 🔄 Script Prebuild

Le script `prebuild` dans `package.json` gère automatiquement la construction des dépendances :

```json
{
  "scripts": {
    "prebuild": "cd ../../.. && pnpm --filter @ezstart/types build && pnpm --filter @ezstart/express-core build && pnpm --filter @ezstart/ui build && pnpm --filter @tower-defense/config build && pnpm --filter @tower-defense/types build && pnpm --filter @tower-defense/utils build",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

### 🌍 Variables d'Environnement

**Obligatoires :**

- `MONGODB_URI` - URI de connexion MongoDB
- `PORT` - Port du serveur (généralement 10000 sur Render)

**Optionnelles :**

- `NODE_ENV` - Environnement (production)
- `CORS_ORIGIN` - Origines CORS autorisées

### 🚀 Processus de Déploiement

1. **Installation :** `pnpm install --frozen-lockfile`
2. **Prebuild :** Construction des packages workspace
3. **Build :** Compilation TypeScript → JavaScript
4. **Start :** Démarrage du serveur Node.js

### 🔍 Dépannage

#### Erreurs Communes

**❌ Module not found :**

- Vérifier que le `prebuild` s'exécute correctement
- S'assurer que tous les packages workspace sont construits

**❌ TypeScript errors :**

- Vérifier les types `any` → remplacer par des types explicites
- S'assurer que les imports ont les extensions `.js`

**❌ ES Module errors :**

- Tous les imports relatifs doivent avoir l'extension `.js`
- Vérifier que `"type": "module"` est dans `package.json`

#### Logs Utiles

```bash
# Vérifier la construction locale
pnpm --filter api-tower-defense build

# Tester le démarrage local
pnpm --filter api-tower-defense start

# Vérifier les types
pnpm --filter api-tower-defense typecheck
```

### 📊 Monitoring

- **URL de l'API :** `https://ezstart-api.onrender.com`
- **Logs :** Disponibles dans le dashboard Render
- **Health Check :** `/health` endpoint

### 🔄 Auto-Deploy

- **Activé :** Oui
- **Trigger :** Push sur la branche `master`
- **Filtres :** Seuls les changements dans `apps/tower-defense/api` déclenchent un rebuild

---

## 🎯 Configuration Alternative (Ancienne)

⚠️ **Déconseillée** - Utiliser la configuration optimale ci-dessus

```
Root Directory: (vide)
Build Command: pnpm install --frozen-lockfile && pnpm --filter api-tower-defense build
Start Command: pnpm --filter api-tower-defense start
```

Cette configuration fonctionne mais est moins performante car elle télécharge tout le monorepo.
