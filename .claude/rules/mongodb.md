## 🗄️ MongoDB - Connexion Centralisée

### Single Source of Truth : connectToMongo()

**TOUJOURS** utiliser `connectToMongo(dbName)` depuis `@ezstart/express-core` :

```typescript
// ❌ MAUVAIS
import mongoose from 'mongoose'
mongoose.connect(process.env.MONGO_URL)
const MyModel = mongoose.model('MyModel', schema)

// ✅ BON
import { connectToMongo } from '@ezstart/express-core'
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

### TypeScript Workaround

Ajouter `// @ts-expect-error` avant les appels Mongoose si type inference échoue :

```typescript
// @ts-expect-error - Mongoose type inference issue with factory pattern
const user = await AuthUserModel.findOne({ email })
```
