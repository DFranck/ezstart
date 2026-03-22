# MongoDB - Connexion Centralisée

## Overview

Ce document décrit l'architecture de connexion MongoDB centralisée pour tout le monorepo @ezstart.

**Objectif :** Une seule connexion MongoDB partagée entre tous les packages et APIs, avec fail-fast et timeouts configurés.

## Problèmes Résolus

### Avant (Multiple Connections)

- ❌ Chaque package créait sa propre connexion avec `mongoose.connect()`
- ❌ Buffering timeout errors (`MongooseError: Operation buffered timed out`)
- ❌ Désynchronisation entre models (certains attachés à la mauvaise connexion)
- ❌ Memory leaks avec multiples instances de mongoose
- ❌ Impossible de contrôler l'ordre de connexion (scheduler démarre avant MongoDB ready)

### Après (Single Shared Connection)

- ✅ Une seule connexion partagée via `connectToMongo()`
- ✅ Fail-fast avec `bufferCommands: false` (erreurs immédiates au lieu de buffering)
- ✅ Tous les models attachés à la même connexion
- ✅ Timeouts configurés (15s connection + server selection)
- ✅ Attente garantie du "ready" state avant de démarrer schedulers

## Architecture

### 1. Connection Centralisée - `mongo.ts`

**Fichier :** [`packages/express-core/src/mongo.ts`](./src/mongo.ts)

```typescript
import mongoose from 'mongoose'

let isConnecting = false

export async function connectToMongo(): Promise<typeof mongoose> {
  // Already connected - return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  // Connection in progress - wait for it to complete
  if (!isConnecting) {
    isConnecting = true

    const mongoUrl = process.env.MONGO_URL
    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is not defined')
    }

    // Disable buffering for fail-fast behavior
    mongoose.set('bufferCommands', false)

    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    })
  }

  // Wait for connection to be fully established
  await mongoose.connection.asPromise()

  return mongoose
}
```

**Features :**

- Connection pooling (seule instance pour tout le monorepo)
- Automatic retry logic
- Fail-fast avec `bufferCommands: false`
- Timeouts configurés pour production (15s)
- Thread-safe avec flag `isConnecting`

### 2. Models avec Factory Functions

**Pattern obligatoire :** Tous les models DOIVENT utiliser des factory functions.

**❌ MAUVAIS (Direct Export) :**

```typescript
import mongoose from 'mongoose'

const schema = new mongoose.Schema({ name: String })
export const User = mongoose.model('User', schema) // Multiple connections possibles!
```

**✅ BON (Factory Function) :**

```typescript
import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  {
    bufferCommands: false, // Disable buffering
    timestamps: true,
  }
)

/**
 * Factory function to get User model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getUserModel() {
  const mongoose = await connectToMongo()
  return mongoose.models.User || mongoose.model('User', userSchema)
}
```

**Usage :**

```typescript
import { getUserModel } from './models/User.js'

// In routes or services
const User = await getUserModel()
await User.create({ name: 'John', email: 'john@example.com' })

const users = await User.find({ email: /example.com/ })
```

### 3. API Startup - Wait for MongoDB Ready

**Pattern obligatoire :** Attendre `connectToMongo()` avant de démarrer schedulers/background jobs.

```typescript
import { connectToMongo, startServer, createApp, getApiPort } from '@ezstart/express-core'

const app = createApp({ apiApp: 'monitoring' })
const PORT = getApiPort('monitoring')

// ✅ Wait for MongoDB to be fully ready
connectToMongo()
  .then(() => {
    console.log('✅ Connected to MongoDB (shared connection)')
    return startServer(app, { routes, registries, serviceName: 'Monitoring API', port: PORT })
  })
  .then(() => {
    console.log('✅ Server started, MongoDB fully operational')
    // Start background jobs ONLY after MongoDB is ready
    healthCheckScheduler.start()
  })
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

## Configuration

### Variables d'Environnement

**Chaque API utilise son propre `MONGO_URL` :**

```env
# apps/ezauth/api/.env.local
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/ezauth

# apps/monitoring/api/.env.local
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/ezstart-monitoring
```

### Timeouts

**Configurés automatiquement dans `connectToMongo()` :**

- `serverSelectionTimeoutMS: 15000` - Temps d'attente pour trouver un serveur MongoDB (15s)
- `connectTimeoutMS: 15000` - Temps d'attente pour établir la connexion initiale (15s)
- `bufferCommands: false` - Fail-fast (erreur immédiate au lieu de buffering)

**Recommandations production :**

- Utiliser MongoDB Atlas (connexion rapide, serveurs optimisés)
- Surveiller les logs pour "Slow connection" warnings
- Ajuster les timeouts si nécessaire (max 30s recommandé)

## Debugging

### Connection State

```typescript
import { getConnectionState } from '@ezstart/express-core'

const state = getConnectionState()
console.log(`[MongoDB] Connection state: ${state}`)

// States:
// 0 = disconnected
// 1 = connected
// 2 = connecting
// 3 = disconnecting
```

### Logging

```typescript
// Enable Mongoose debug mode (dev only)
mongoose.set('debug', true)

// Log connection state before operations
console.log(`[MongoDB] Connection state: ${mongoose.connection.readyState}`)
```

## Migration Guide

### Migrer une API existante vers connectToMongo()

**Étapes :**

1. **Remplacer connectToMongo() par connectToMongo() dans index.ts**

```diff
- import { connectToMongo } from '@ezstart/express-core'
+ import { connectToMongo } from '@ezstart/express-core'

- connectToMongo('database-name')
+ connectToMongo()
    .then(() => {
      console.log('✅ Connected to MongoDB (shared connection)')
      return startServer(...)
    })
```

2. **Convertir tous les models en factory functions**

```diff
- import mongoose from 'mongoose'
+ import { connectToMongo } from '@ezstart/express-core'
+ import { Schema } from 'mongoose'

- const schema = new mongoose.Schema({...})
+ const schema = new Schema({...}, { bufferCommands: false })

- export const MyModel = mongoose.model('MyModel', schema)
+ export async function getMyModel() {
+   const mongoose = await connectToMongo()
+   return mongoose.models.MyModel || mongoose.model('MyModel', schema)
+ }
```

3. **Mettre à jour les routes/services**

```diff
- import { MyModel } from '../models/MyModel.js'
+ import { getMyModel } from '../models/MyModel.js'

async function handler(req, res) {
+   const MyModel = await getMyModel()
    const items = await MyModel.find()
    res.json(items)
}
```

4. **Attendre MongoDB avant les schedulers**

```diff
connectToMongo()
  .then(() => startServer(...))
  .then(() => {
+     console.log('✅ MongoDB fully operational')
+     // Start scheduler AFTER MongoDB is ready
      scheduler.start()
  })
```

5. **Tester**

```bash
# Build
pnpm --filter api-my-app build

# Test connection
pnpm --filter api-my-app dev
# Verify logs: "✅ Connected to MongoDB (shared connection)"

# Test CRUD operations
curl http://localhost:5000/api/my-resource
```

## APIs Migrées

### ✅ Monitoring API (19/10/2025)

**Fichiers modifiés :**

- `apps/monitoring/api/src/index.ts` - Utilise `connectToMongo()` au lieu de `connectToMongo()`
- `apps/monitoring/api/src/models/HealthCheck.ts` - Factory function `getHealthCheckModel()`
- `apps/monitoring/api/src/routes/history.ts` - Appelle `getHealthCheckModel()`
- `apps/monitoring/api/src/routes/trigger.ts` - Appelle `getHealthCheckModel()`
- `apps/monitoring/api/src/services/healthCheckScheduler.ts` - Appelle `getHealthCheckModel()`

**Résultats :**

- ✅ Build sans erreur
- ✅ Pas de buffering timeout errors
- ✅ Scheduler démarre seulement après MongoDB ready
- ✅ Factory functions pour tous les models

### ⏳ APIs à migrer

- EZAuth API
- EZPay API
- EZBill API
- Tower Defense API
- GreenPulse API

## Bonnes Pratiques

### ✅ À FAIRE

1. **TOUJOURS** utiliser `connectToMongo()` au lieu de `mongoose.connect()`
2. **TOUJOURS** créer des factory functions pour les models (`getModelName()`)
3. **TOUJOURS** attendre `connectToMongo()` avant de démarrer schedulers/cron jobs
4. **TOUJOURS** utiliser `bufferCommands: false` dans les schemas
5. **TOUJOURS** utiliser Node.js LTS (20.18.x) en production
6. **TOUJOURS** configurer `MONGO_URL` dans `.env.local` (dev) et Railway/Vercel (prod)

### ❌ À ÉVITER

1. **JAMAIS** importer `mongoose` directement dans les models (use `Schema` from mongoose)
2. **JAMAIS** exporter directement un model (use factory function)
3. **JAMAIS** démarrer des background jobs avant `connectToMongo()` ready
4. **JAMAIS** utiliser plusieurs connexions MongoDB dans le même process
5. **JAMAIS** ignorer les warnings "Unsupported engine" (upgrade to Node LTS)

## Node.js LTS Requirement

**Obligatoire :** Utiliser Node.js LTS (20.18.x) pour la production.

Mongoose et le driver MongoDB sont optimisés et testés sur LTS uniquement. Les versions expérimentales (22+, 25+) peuvent causer des incompatibilités.

**Configuration :**

```json
{
  "engines": {
    "node": "20.18.x",
    "pnpm": "10.12.x"
  }
}
```

**Status :**

- ✅ Root package.json : `node: "20.18.x"`
- ✅ Monitoring API : `node: "20.18.x"`
- ⏳ Autres APIs : À configurer

## Références

- [Mongoose Connection Docs](https://mongoosejs.com/docs/connections.html)
- [MongoDB Driver Timeouts](https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/)
- [Mongoose bufferCommands](https://mongoosejs.com/docs/guide.html#bufferCommands)
- [@ezstart/express-core README](./README.md)
- [CLAUDE.md - MongoDB Section](../../CLAUDE.md#mongodb---connexion-centralisée)

## Support

Pour toute question ou problème :

1. Vérifier les logs de connexion MongoDB
2. Vérifier `getConnectionState()` avant les opérations
3. Consulter ce document et CLAUDE.md
4. Créer un issue sur GitHub avec logs complets
