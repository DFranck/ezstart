## 🔐 Environnements et Secrets

### 1. Architecture .env Standardisée

**3 fichiers par projet :**

```
apps/[app]/api/
├── .env.example       # ✅ Template (COMMITTÉ)
├── .env.local         # ✅ Dev local (GITIGNORED)
└── .env.production    # ✅ Production (GITIGNORED)
```

**Workflow :**

1. **Développement** : Copier `.env.example` → `.env.local` et remplir
2. **Production** : Copier variables dans Railway/Vercel Dashboard
3. **Template** : TOUJOURS à jour avec toutes les variables

### 2. Règles Critiques

- ✅ `.env.example` → Template SANS secrets (committé)
- ✅ `.env.local` → Dev avec secrets réels (gitignored)
- ✅ `.env.production` → Production avec secrets réels (gitignored)
- ❌ `.env` → NE PLUS UTILISER (confusion)
- ✅ api-core charge `.env.local` en priorité

### 3. Variables PORT Obsolètes

❌ **Plus besoin de `PORT=` dans `.env.local`**

Les ports sont auto-détectés depuis `@ezstart/config` :

```typescript
// APIs
const PORT = getApiPort('ezauth') // 6110

// Web apps (via dev-server.js)
// Détection automatique du nom d'app → port
```
