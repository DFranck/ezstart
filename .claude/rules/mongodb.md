## 🗄️ MongoDB - Connexion Centralisée

### Single Source of Truth : connectToMongo()

**TOUJOURS** utiliser `connectToMongo(dbName)` depuis `@ezstart/api-core` :

```typescript
// ❌ MAUVAIS
import mongoose from 'mongoose'
mongoose.connect(process.env.MONGO_URL)
const MyModel = mongoose.model('MyModel', schema)

// ✅ BON
import { connectToMongo } from '@ezstart/api-core'
import { Schema } from 'mongoose'

// Factory function pour model
export async function getMyModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.MyModel || mongoose.model('MyModel', schema)
}

// Usage
const MyModel = await getMyModel()
const doc = await MyModel.findOne({ ... })
```

### Règles Obligatoires

1. ✅ **Factory Functions** pour tous les models
   - Exporter `async function getModelName()` au lieu du model directement
   - Attacher model à la connexion partagée via `connectToMongo()`

2. ✅ **Wait for Ready** avant schedulers/cron jobs

   ```typescript
   connectToMongo('database-name')
     .then(() => startServer(...))
     .then(() => scheduler.start()) // Après MongoDB ready
   ```

3. ✅ **bufferCommands: false** dans schemas

   ```typescript
   const schema = new Schema({...}, { bufferCommands: false })
   ```

4. ✅ **Node.js LTS** (20.18.x) pour production

   ```json
   "engines": { "node": "20.18.x" }
   ```

5. ⚠️ **1 DB par process API** — `connectToMongo(dbName)` est un singleton : le premier appel établit la connexion, tous les appels suivants avec un `dbName` différent sont **ignorés silencieusement** (un `logger.warn` trace l'incident). Ne jamais concevoir une API qui écrit dans plusieurs DBs via ce helper. Si tu as besoin d'une autre DB, crée une autre API ou utilise `mongoose.connection.useDb(name)` explicitement dans le code appelant.

### TypeScript Workaround

Ajouter `// @ts-expect-error` avant les appels Mongoose si type inference échoue :

```typescript
// @ts-expect-error - Mongoose type inference issue with factory pattern
const user = await AuthUserModel.findOne({ email })
```
