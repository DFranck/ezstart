## 🔌 APIs - Standards Express

### 1. Infrastructure Express-Core

**TOUJOURS** utiliser `@ezstart/express-core` :

```typescript
import {
  createApp,
  createRateLimiter,
  connectToMongo,
  startServer,
  getApiPort,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const PORT = getApiPort('ezauth')
const app = createApp({ apiApp: 'ezauth' }) // CORS auto + dotenv

// ✅ Rate limiting protection (OBLIGATOIRE)
app.use(createRateLimiter())

// Routes
const registry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(registry, router)

app.use('/api/auth', router)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Démarrage
connectToMongo('ezauth')
  .then(() =>
    startServer(app, {
      routes: router,
      registries: [registry],
      serviceName: 'EZAuth',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

### 1.5 Rate Limiting OBLIGATOIRE

**⚠️ TOUTES les APIs DOIVENT avoir du rate limiting** pour se protéger contre les abus et attaques DDoS.

✅ **Standard (100 req/15min per IP)** :

```typescript
import { createRateLimiter } from '@ezstart/express-core'

// Applique rate limiting sur toutes les routes (sauf /api/health)
app.use(createRateLimiter())
```

✅ **Strict pour endpoints sensibles (5 req/min)** :

```typescript
import { createStrictRateLimiter } from '@ezstart/express-core'

// Auth endpoints
app.post('/api/auth/login', createStrictRateLimiter(), loginHandler)
app.post('/api/auth/logout', createStrictRateLimiter(), logoutHandler)
```

✅ **Très strict pour création de compte (3 req/hour)** :

```typescript
import { createVeryStrictRateLimiter } from '@ezstart/express-core'

// Account creation
app.post('/api/auth/register', createVeryStrictRateLimiter(), registerHandler)
app.post('/api/auth/reset-password', createVeryStrictRateLimiter(), resetHandler)
```

**Configuration automatique :**

- Retourne 429 avec `Retry-After` header
- Headers standards : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- Skip automatique de `/api/health`
- Format d'erreur standardisé :
  ```json
  {
    "error": {
      "message": "Too many requests from this IP, please try again later.",
      "code": "RATE_LIMIT_EXCEEDED",
      "retryAfter": 900
    }
  }
  ```

### 2. Action-Based Routing OBLIGATOIRE

✅ **Organisation des routes par action** (1 fichier = 1 action) :

```
src/routes/
├── {feature}/
│   ├── {action}.ts         # createUser.ts, listUsers.ts, etc.
│   └── index.ts            # Feature router
└── index.ts                # Main router
```

**Naming convention:**

- `create{Entity}.ts` - POST action
- `list{Entities}.ts` - GET collection
- `get{Entity}ById.ts` - GET single
- `update{Entity}.ts` - PATCH/PUT action
- `delete{Entity}.ts` - DELETE action
- `{action}With{Modifier}.ts` - Special actions (generateFormWithAI.ts)

**Example: Conversations feature**

```
routes/conversations/
├── createConversation.ts      # POST /conversations
├── listConversations.ts       # GET /conversations
├── getConversationById.ts     # GET /conversations/:id
├── updateConversation.ts      # PATCH /conversations/:id
├── deleteConversation.ts      # DELETE /conversations/:id
└── index.ts                   # Exports router
```

**Single action file:**

```typescript
// createConversation.ts
import { Router } from '@ezstart/express-core'
import { createConversationController } from '../../controllers/conversations/createConversation.js'

export const createConversationRouter = Router()
createConversationRouter.post('/', createConversationController)
```

**Feature index:**

```typescript
// conversations/index.ts
import { Router } from '@ezstart/express-core'
import { createConversationRouter } from './createConversation.js'
import { listConversationsRouter } from './listConversations.js'

export const conversationsRouter = Router()
conversationsRouter.use('/', createConversationRouter).use('/', listConversationsRouter)
```

**Benefits:**

- ✅ One file = One action (clear responsibility)
- ✅ Easy to find (`getConversationById.ts`)
- ✅ No merge conflicts
- ✅ Easy to test individually
- ✅ Clear git history

**See:** [apps/green-pulse/api/docs/ROUTING-PATTERN.md](../../apps/green-pulse/api/docs/ROUTING-PATTERN.md)

### 3. Préfixe /api OBLIGATOIRE

✅ **Toutes les routes DOIVENT commencer par `/api`** :

```typescript
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.get('/api/health', healthCheck)
```

**Raisons :**

- Séparation claire API vs assets/web
- Proxying nginx/reverse proxy simplifié
- Convention universelle (Next.js, Express)
- Règles CORS/auth plus simples

### 4. Point d'Entrée index.ts

✅ **Convention Node.js standard** :

```
apps/[app]/api/
├── src/
│   ├── index.ts        # ✅ Point d'entrée obligatoire
│   ├── routes/
│   ├── services/
│   └── models/
└── package.json
```

**package.json :**

```json
{
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  }
}
```

### 4. OpenAPI/Swagger Automatique

✅ **Toutes les APIs DOIVENT avoir de la doc OpenAPI** :

```typescript
import { createRoute, z } from '@hono/zod-openapi'

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
          }),
        },
      },
    },
  },
})

registry.registerPath(loginRoute)
```

**Accès doc :** `http://localhost:50XX/docs` (Swagger UI automatique)
