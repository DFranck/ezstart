## 🚨 RÈGLES CRITIQUES - PROTECTION DES DONNÉES (2025-10-26)

**⚠️ INCIDENT:** Le 26/10/2025, des tests ont supprimé TOUTES les données de production MongoDB (users, clients, invoices). Ces règles DOIVENT être suivies pour éviter que ça se reproduise.

### ❌ INTERDICTIONS ABSOLUES

1. **JAMAIS lancer des tests sans `.env.test`**
   - Chaque API DOIT avoir un `.env.test` avec `MONGO_URL=mongodb://localhost:27017/[db]-test`
   - `vitest.config.ts` DOIT charger `.env.test` AVANT tout le reste
   - `NODE_ENV=test` DOIT être forcé dans vitest.config.ts

2. **JAMAIS utiliser `.env.local` avec production URL pour les tests**
   - `.env.local` est pour le développement LOCAL uniquement
   - Tests utilisent TOUJOURS `.env.test` + MongoMemoryServer

3. **JAMAIS lancer `pnpm test` sans vérifier l'environnement**

   ```bash
   # ❌ DANGEREUX
   pnpm test

   # ✅ SÉCURISÉ - Vérifier d'abord
   echo $NODE_ENV  # Doit être "test"
   cat .env.test   # Doit pointer vers localhost
   pnpm test
   ```

4. **JAMAIS utiliser `deleteMany({})` ou `drop()` sans protection**

   ```typescript
   // ❌ DANGEREUX - Peut supprimer la production !
   await Model.deleteMany({})

   // ✅ SÉCURISÉ - Vérifier l'environnement
   if (process.env.NODE_ENV !== 'test') {
     throw new Error('Cannot delete data outside test environment!')
   }
   await Model.deleteMany({})
   ```

### ✅ OBLIGATIONS ABSOLUES

1. **TOUJOURS avoir des environnements séparés**

   ```
   DEV:  mongodb://localhost:27017/[db]-dev
   TEST: MongoMemoryServer (en mémoire)
   PROD: mongodb+srv://...@cluster.mongodb.net/[db]
   ```

2. **TOUJOURS faire des backups hebdomadaires** (M0 gratuit = PAS de backups auto)

   ```bash
   # Chaque semaine (ou avant tests importants)
   ./scripts/backup-mongodb.sh
   ```

3. **TOUJOURS vérifier NODE_ENV dans les scripts destructifs**

   ```typescript
   if (process.env.NODE_ENV === 'production') {
     throw new Error('This script cannot run in production!')
   }
   ```

4. **TOUJOURS upgrader vers M2+ ($9/mois) si données critiques**
   - M0 = Pas de backups automatiques
   - M2+ = Snapshots automatiques + point-in-time recovery

### 📋 Checklist Avant Chaque Test

- [ ] `.env.test` existe et pointe vers localhost
- [ ] `vitest.config.ts` charge `.env.test`
- [ ] `NODE_ENV=test` est forcé
- [ ] `setupTestDatabase()` utilise MongoMemoryServer
- [ ] Backup récent disponible (< 7 jours)

### 🔧 Template Vitest Config Sécurisé

```typescript
import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// 🔒 CRITICAL: Load .env.test to prevent touching production
config({ path: resolve(__dirname, '.env.test') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test', // 🔒 Force test environment
    },
  },
})
```
