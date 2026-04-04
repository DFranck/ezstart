# Routing Pattern - Action-Based Organization

GreenPulse API uses **action-based routing** for better maintainability and clarity.

## Principles

✅ **One file = One action**
✅ **Grouped by feature**
✅ **Clear naming conventions**
✅ **Easy to find and test**

## Structure

```
src/routes/
├── {feature}/
│   ├── {action}.ts         # Single route action
│   ├── {action}.ts
│   └── index.ts            # Feature router export
│
└── index.ts                # Main router
```

## Naming Convention

### File naming: `{action}.ts`

Pattern: `{verb}{Entity}[ById|With{Modifier}].ts`

**Examples:**

- `createConversation.ts` - POST action
- `listConversations.ts` - GET collection
- `getConversationById.ts` - GET single item
- `updateConversation.ts` - PATCH/PUT action
- `deleteConversation.ts` - DELETE action
- `generateFormWithAI.ts` - Special action with modifier

### Route path pattern

```typescript
// In {feature}/index.ts
router
  .post('/', createRoute) // POST /{feature}
  .get('/', listRoute) // GET /{feature}
  .get('/:id', getByIdRoute) // GET /{feature}/:id
  .patch('/:id', updateRoute) // PATCH /{feature}/:id
  .delete('/:id', deleteRoute) // DELETE /{feature}/:id
  .post('/generate', generateRoute) // POST /{feature}/generate
```

## Example Implementation

### Feature: Conversations

```
routes/conversations/
├── createConversation.ts      # POST /conversations
├── listConversations.ts       # GET /conversations
├── getConversationById.ts     # GET /conversations/:id
├── updateConversation.ts      # PATCH /conversations/:id
├── deleteConversation.ts      # DELETE /conversations/:id
└── index.ts                   # Router
```

### Single action file: `createConversation.ts`

```typescript
/**
 * POST /conversations
 * Create a new conversation
 */

import { Router } from '@ezstart/express-core'
import { createConversationController } from '../../controllers/conversations/createConversation.js'

export const createConversationRouter = Router()

createConversationRouter.post('/', createConversationController)
```

### Feature index: `conversations/index.ts`

```typescript
/**
 * Conversations Routes
 * Base path: /api/conversations
 */

import { Router } from '@ezstart/express-core'
import createConversationRouter, { createConversationRegistry } from './createConversation.js'
import listConversationsRouter, { listConversationsRegistry } from './listConversations.js'
import getConversationByIdRouter, { getConversationByIdRegistry } from './getConversationById.js'
import updateConversationRouter, { updateConversationRegistry } from './updateConversation.js'
import deleteConversationRouter, { deleteConversationRegistry } from './deleteConversation.js'

// Export all registries as an array for OpenAPI documentation
export const conversationRegistries = [
  createConversationRegistry,
  listConversationsRegistry,
  getConversationByIdRegistry,
  updateConversationRegistry,
  deleteConversationRegistry,
]

const router = Router()

router
  .use('/', createConversationRouter) // POST /
  .use('/', listConversationsRouter) // GET /
  .use('/', getConversationByIdRouter) // GET /:id
  .use('/', updateConversationRouter) // PATCH /:id
  .use('/', deleteConversationRouter) // DELETE /:id

export default router
```

### Main router: `routes/index.ts`

```typescript
import { Router } from '@ezstart/express-core'
import conversationsRouter, { conversationRegistries } from './conversations/index.js'
import formsRouter, { formRegistries } from './forms/index.js'
import chatRouter, { chatRegistries } from './chat/index.js'

const router = Router()

// Combine all OpenAPI registries
export const globalRegistry = [...conversationRegistries, ...formRegistries, ...chatRegistries]

router
  .use('/conversations', conversationsRouter)
  .use('/forms', formsRouter)
  .use('/chat', chatRouter)

export default router
```

## OpenAPI Registry Pattern

Each action file exports its own OpenAPI registry for documentation:

```typescript
// createConversation.ts
import { Router, createRouterWithDoc, OpenAPIRegistry } from '@ezstart/express-core'

export const createConversationRegistry = new OpenAPIRegistry()
const router = Router()
export const createConversationRouter = createRouterWithDoc(createConversationRegistry, router, '/')

createConversationRouter.post(
  '/',
  async (req, res) => {
    /* ... */
  },
  {
    summary: 'Create new conversation',
    tags: ['Conversations'],
    bodySchema: CreateConversationSchema,
    responseSchema: ApiResponseSchema(ConversationSchema),
  }
)

export default router
```

### Aggregating registries

Feature index exports array of registries:

```typescript
// conversations/index.ts
export const conversationRegistries = [
  createConversationRegistry,
  listConversationsRegistry,
  getConversationByIdRegistry,
  // ... all action registries
]
```

Main router spreads feature registry arrays:

```typescript
// routes/index.ts
export const globalRegistry = [...conversationRegistries, ...formRegistries, ...chatRegistries]
```

**Why arrays?** OpenAPIRegistry doesn't have a `merge()` method, so we export/spread arrays.

## Benefits

### 1. Clarity

- File name = exact action
- No scrolling through huge files
- Intent is obvious

### 2. Maintainability

- Changes isolated to single file
- Easy to add new actions
- Safe to delete unused actions

### 3. Testing

- One test file per action
- Clear test boundaries
- Easy to mock

### 4. Git/PR

- Small, focused commits
- Clear PR diffs
- Easy to review

### 5. Team collaboration

- No merge conflicts
- Multiple devs can work on same feature
- Clear ownership

## Anti-patterns to avoid

❌ **One big file per feature**

```typescript
// conversations.ts (1000+ lines)
router.post('/', ...)
router.get('/', ...)
router.get('/:id', ...)
router.patch('/:id', ...)
router.delete('/:id', ...)
```

❌ **Mixed concerns**

```typescript
// routes/api.ts
router.post('/conversations', ...)
router.post('/forms', ...)
router.post('/chat', ...)
```

❌ **Unclear naming**

```typescript
// routes/conv1.ts  ← What does this do?
// routes/chat-new.ts  ← Why "new"?
```

## Migration Guide

### Step 1: Create feature folder

```bash
mkdir -p src/routes/{feature}
```

### Step 2: Split routes into actions

```typescript
// Old: conversations.ts
router.post('/', createController)
router.get('/', listController)

// New: conversations/createConversation.ts
export const createConversationRouter = Router()
createConversationRouter.post('/', createController)

// New: conversations/listConversations.ts
export const listConversationsRouter = Router()
listConversationsRouter.get('/', listController)
```

### Step 3: Create feature index

```typescript
// conversations/index.ts
export const conversationsRouter = Router()
conversationsRouter.use('/', createConversationRouter).use('/', listConversationsRouter)
```

### Step 4: Update main router

```typescript
// routes/index.ts
import { conversationsRouter } from './conversations/index.js'
router.use('/conversations', conversationsRouter)
```

### Step 5: Test & delete old file

```bash
# Test all endpoints still work
curl -X POST http://localhost:6160/api/conversations

# Delete old file
rm src/routes/conversations.ts
```

## Controller organization (optional but recommended)

Follow the same pattern for controllers:

```
controllers/conversations/
├── createConversation.ts
├── listConversations.ts
├── getConversationById.ts
├── updateConversation.ts
├── deleteConversation.ts
└── index.ts
```

## Service organization (optional but recommended)

Follow the same pattern for services:

```
services/conversations/
├── createConversation.service.ts
├── listConversations.service.ts
├── getConversationById.service.ts
├── updateConversation.service.ts
├── deleteConversation.service.ts
└── index.ts
```

## Complete Example

Full feature implementation from route → controller → service:

```
routes/conversations/
  └── createConversation.ts → POST /conversations
        ↓
controllers/conversations/
  └── createConversation.ts → validates input, calls service
        ↓
services/conversations/
  └── createConversation.service.ts → business logic, DB access
```

## References

- Express.js Router: https://expressjs.com/en/guide/routing.html
- RESTful API design: https://restfulapi.net/
- Action-based architecture: Clean Code principles

## Questions?

See [AI-SDK-INTEGRATION.md](./AI-SDK-INTEGRATION.md) for AI-specific routing examples.
