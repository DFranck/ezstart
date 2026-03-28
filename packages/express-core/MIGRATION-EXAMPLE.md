# Migration Example: EZAuth API

This document shows a complete example of migrating an existing API to use `connectToMongo()`.

## Before Migration

### auth-user.ts (Model)

```typescript
import { Schema, model, Document } from 'mongoose'

export interface AuthUserDocument extends Document {
  email: string
  username: string
  passwordHash: string
}

const authUserSchema = new Schema<AuthUserDocument>({
  email: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, {
  timestamps: true,
})

// ❌ Direct export = potential multiple connections
export const AuthUserModel = model<AuthUserDocument>('AuthUser', authUserSchema)
```

### auth.service.ts (Service)

```typescript
import { AuthUserModel } from '../models/auth-user.js'

export class AuthService {
  static async register(data: RegisterRequest) {
    // ❌ Direct usage of model
    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.username }]
    })

    const user = new AuthUserModel({
      email: data.email,
      username: data.username,
      passwordHash: data.password,
    })

    await user.save()
    return user
  }
}
```

### index.ts (API Startup)

```typescript
import { connectToMongo } from '@ezstart/express-core'

// ❌ Old connection method
connectToMongo('ezauth')
  .then(() => {
    console.log('✅ Connected to MongoDB')
    return startServer(app, {...})
  })
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

## After Migration

### auth-user.ts (Model with Factory)

```typescript
import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document } from 'mongoose'

export interface AuthUserDocument extends Document {
  email: string
  username: string
  passwordHash: string
}

const authUserSchema = new Schema<AuthUserDocument>({
  email: { type: String, required: true },
  username: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, {
  timestamps: true,
  bufferCommands: false, // ✅ Fail-fast
})

// ✅ Factory function
export async function getAuthUserModel() {
  const mongoose = await connectToMongo()
  return mongoose.models.AuthUser || mongoose.model<AuthUserDocument>('AuthUser', authUserSchema)
}
```

### auth.service.ts (Service with Factory)

```typescript
import { getAuthUserModel } from '../models/auth-user.js'

export class AuthService {
  static async register(data: RegisterRequest) {
    // ✅ Get model from shared connection
    const AuthUserModel = await getAuthUserModel()

    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: data.email }, { username: data.username }]
    })

    const user = new AuthUserModel({
      email: data.email,
      username: data.username,
      passwordHash: data.password,
    })

    await user.save()
    return user
  }
}
```

### index.ts (API Startup with connectToMongo)

```typescript
import { connectToMongo } from '@ezstart/express-core'

// ✅ New centralized connection
connectToMongo()
  .then(() => {
    console.log('✅ Connected to MongoDB (shared connection)')
    return startServer(app, {...})
  })
  .then(() => {
    console.log('✅ Server started, MongoDB fully operational')
    // ✅ Start scheduler ONLY after MongoDB is ready
    scheduler.start()
  })
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

## Migration Checklist

### 1. Models

- [ ] Import `connectToMongo` from `@ezstart/express-core`
- [ ] Import `Schema, Document` from `mongoose` (not default import)
- [ ] Add `bufferCommands: false` to schema options
- [ ] Convert direct export to factory function
- [ ] Export factory function: `export async function getModelName()`

### 2. Services/Routes

- [ ] Update imports: `getModelName` instead of `ModelName`
- [ ] Call factory at start of each method: `const Model = await getModelName()`
- [ ] Update all usages of the model in the function

### 3. API Startup (index.ts)

- [ ] Replace `connectToMongo('db')` import with `connectToMongo`
- [ ] Replace `connectToMongo('db')` call with `connectToMongo()`
- [ ] Move scheduler.start() to AFTER connectToMongo() resolves
- [ ] Add logs for debugging: "MongoDB fully operational"

### 4. Testing

- [ ] Build: `pnpm --filter api-NAME build`
- [ ] Run locally: `pnpm --filter api-NAME dev`
- [ ] Test CRUD operations: Create, Read, Update, Delete
- [ ] Test scheduler (if applicable): Verify it waits for MongoDB

### 5. Environment Variables

- [ ] Ensure `MONGO_URL` is set in `.env.local` (dev)
- [ ] Ensure `MONGO_URL` is set in Railway/Render (prod)
- [ ] Test connection string format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

## Common Patterns

### Pattern 1: Simple CRUD Route

```typescript
// Before
import { UserModel } from '../models/User.js'

router.get('/users', async (req, res) => {
  const users = await UserModel.find()
  res.json(users)
})

// After
import { getUserModel } from '../models/User.js'

router.get('/users', async (req, res) => {
  const UserModel = await getUserModel()
  const users = await UserModel.find()
  res.json(users)
})
```

### Pattern 2: Service Class

```typescript
// Before
import { ProductModel } from '../models/Product.js'

export class ProductService {
  static async getAll() {
    return ProductModel.find()
  }

  static async create(data) {
    const product = new ProductModel(data)
    return product.save()
  }
}

// After
import { getProductModel } from '../models/Product.js'

export class ProductService {
  static async getAll() {
    const ProductModel = await getProductModel()
    return ProductModel.find()
  }

  static async create(data) {
    const ProductModel = await getProductModel()
    const product = new ProductModel(data)
    return product.save()
  }
}
```

### Pattern 3: Background Job/Scheduler

```typescript
// Before
import { LogModel } from '../models/Log.js'

class LogCleanupScheduler {
  start() {
    cron.schedule('0 0 * * *', async () => {
      await LogModel.deleteMany({ createdAt: { $lt: cutoffDate } })
    })
  }
}

// After
import { getLogModel } from '../models/Log.js'

class LogCleanupScheduler {
  start() {
    cron.schedule('0 0 * * *', async () => {
      const LogModel = await getLogModel()
      await LogModel.deleteMany({ createdAt: { $lt: cutoffDate } })
    })
  }
}
```

## Troubleshooting

### Error: "Operation buffered timed out"

**Cause:** Model is trying to use MongoDB before connection is established.

**Solution:**
1. Ensure `connectToMongo()` is called in index.ts before startServer()
2. Ensure scheduler waits for connectToMongo() promise to resolve
3. Add `bufferCommands: false` to schema for immediate errors

### Error: "MongooseError: Cannot overwrite model"

**Cause:** Model is being registered multiple times.

**Solution:**
Use factory pattern with check:
```typescript
const mongoose = await connectToMongo()
return mongoose.models.ModelName || mongoose.model('ModelName', schema)
```

### Error: "MONGO_URL is not defined"

**Cause:** Environment variable not loaded.

**Solution:**
1. Check `.env.local` exists in API directory
2. Verify `MONGO_URL=mongodb+srv://...` is set
3. express-core loads dotenv automatically, no manual config needed

## Performance Notes

### Caching Model References (Optional)

For high-performance scenarios, you can cache the model reference:

```typescript
// Option 1: Module-level cache
let cachedModel: any = null

export async function getUserModel() {
  if (cachedModel) return cachedModel
  const mongoose = await connectToMongo()
  cachedModel = mongoose.models.User || mongoose.model('User', userSchema)
  return cachedModel
}

// Option 2: Class-level cache
export class UserService {
  private static modelCache: any = null

  private static async getModel() {
    if (this.modelCache) return this.modelCache
    const mongoose = await connectToMongo()
    this.modelCache = mongoose.models.User || mongoose.model('User', userSchema)
    return this.modelCache
  }

  static async getAll() {
    const UserModel = await this.getModel()
    return UserModel.find()
  }
}
```

**Note:** Caching is optional. The factory function is already fast (microseconds) since `connectToMongo()` returns immediately when connected.

## References

- [MONGODB-ARCHITECTURE.md](./MONGODB-ARCHITECTURE.md) - Full architecture documentation
- [mongo.ts](./src/mongo.ts) - connectToMongo() implementation
- [apps/monitoring/api](../../apps/monitoring/api) - Complete working example
