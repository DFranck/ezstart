## 🔧 Troubleshooting Fréquent

### Port Already in Use

**Problème :** Anciens processus Node.js persistent.

**Solution :**

```bash
# Killer tous les ports @ezstart
pnpm kill:ports

# Ou redémarrer VS Code
```

### TypeScript Errors après Ajout Package

**Problème :** Types non trouvés après ajout workspace dependency.

**Solution :**

```bash
# Reinstaller dépendances
pnpm install

# Rebuild le package
pnpm --filter @ezstart/[package] build

# Relancer TypeScript watcher
pnpm dev:types
```

### CORS Errors en Dev

**Problème :** API rejette requests du frontend.

**Solution :**

```typescript
// Vérifier createApp avec apiApp
const app = createApp({ apiApp: 'ezauth' })

// Vérifier getApiUrl dans web app
const API_URL = getApiUrl('ezauth') // Pas hardcodé
```

### MongoDB Connection Timeout

**Problème :** `bufferCommands` timeout ou multiple connections.

**Solution :**

```typescript
// Utiliser connectToMongo() au lieu de mongoose.connect()
import { connectToMongo } from '@ezstart/express-core'

// Factory functions pour models
export async function getMyModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.MyModel || mongoose.model('MyModel', schema)
}
```
