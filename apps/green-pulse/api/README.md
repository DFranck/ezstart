# GreenPulse API

Backend API for GreenPulse eco-tracking and sustainability platform.

## Overview

GreenPulse API provides endpoints for tracking carbon footprint, managing eco-friendly habits, and analyzing environmental impact. Built with Express, MongoDB, and OpenAI integration for smart recommendations.

## Features

- 🌱 **Carbon Tracking** - Monitor and calculate carbon footprint
- 📊 **Habit Management** - Track eco-friendly habits and routines
- 🤖 **AI Recommendations** - OpenAI-powered sustainability tips
- 📷 **Image Analysis** - Upload and analyze product sustainability
- 📈 **Analytics** - Personal and global environmental impact stats
- 🔐 **JWT Authentication** - Secure user sessions
- 📚 **OpenAPI Docs** - Auto-generated API documentation

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **AI:** OpenAI API
- **Validation:** Zod with OpenAPI
- **Authentication:** JWT
- **File Upload:** Multer
- **Infrastructure:** @ezstart/api-core

## Installation

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm --filter api-green-pulse dev
```

## Environment Variables

Create `.env.local` in this directory:

```env
# Server
PORT=6160
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/greenpulse

# Authentication
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...

# CORS
WEB_URL=http://localhost:6161
```

## Scripts

```bash
# Development
pnpm dev              # Start with hot reload

# Build
pnpm build            # Compile TypeScript
pnpm start            # Run production build

# Quality
pnpm typecheck        # Type checking
pnpm lint             # ESLint
pnpm lint:fix         # Fix linting issues
```

## API Endpoints

### Health Check

```
GET /api/health
```

### Authentication

```
POST /api/auth/register   - Register new user
POST /api/auth/login      - Login user
GET  /api/auth/me         - Get current user
```

### Carbon Tracking

```
GET    /api/carbon             - Get user's carbon data
POST   /api/carbon             - Add carbon entry
GET    /api/carbon/stats       - Get statistics
DELETE /api/carbon/:id         - Delete entry
```

### Habits

```
GET    /api/habits             - List user habits
POST   /api/habits             - Create habit
PUT    /api/habits/:id         - Update habit
DELETE /api/habits/:id         - Delete habit
POST   /api/habits/:id/track   - Track habit completion
```

### AI Recommendations

```
POST /api/recommendations      - Get AI-powered tips
POST /api/recommendations/analyze - Analyze product image
```

### Analytics

```
GET /api/analytics/personal    - Personal impact stats
GET /api/analytics/global      - Global community stats
GET /api/analytics/trends      - Environmental trends
```

## Project Structure

```
apps/green-pulse/api/
├── src/
│   ├── index.ts           # App entry point
│   ├── routes/            # API route handlers
│   │   ├── auth.ts
│   │   ├── carbon.ts
│   │   ├── habits.ts
│   │   └── recommendations.ts
│   ├── models/            # Mongoose models
│   │   ├── User.ts
│   │   ├── CarbonEntry.ts
│   │   └── Habit.ts
│   ├── services/          # Business logic
│   │   ├── carbon.service.ts
│   │   └── openai.service.ts
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── package.json
├── tsconfig.json
├── eslint.config.js
└── README.md
```

## Database Models

### User

```typescript
{
  email: string
  password: string (hashed)
  name: string
  createdAt: Date
  carbonGoal?: number
}
```

### CarbonEntry

```typescript
{
  userId: ObjectId
  category: 'transport' | 'food' | 'energy' | 'goods'
  amount: number (kg CO2)
  description: string
  date: Date
  createdAt: Date
}
```

### Habit

```typescript
{
  userId: ObjectId
  title: string
  description: string
  category: string
  frequency: 'daily' | 'weekly' | 'monthly'
  completions: Date[]
  createdAt: Date
}
```

## OpenAI Integration

The API uses OpenAI for:

- **Smart Recommendations** - Personalized eco-tips based on user data
- **Product Analysis** - Sustainability assessment from images
- **Trend Analysis** - Environmental impact insights

```typescript
// Example: Get AI recommendation
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: 'You are an eco-sustainability expert' },
    { role: 'user', content: `Analyze this carbon footprint: ${data}` },
  ],
})
```

## Authentication

Uses JWT tokens with 7-day expiration:

```typescript
// Protected route example
import { authenticate } from './middleware/auth'

router.get('/api/carbon', authenticate, async (req, res) => {
  // req.user contains authenticated user
  const entries = await CarbonEntry.find({ userId: req.user.id })
  res.json(entries)
})
```

## Related Packages

- [@ezstart/api-core](../../../packages/express-core) - API infrastructure
- [@ezstart/types](../../../packages/types) - Shared types and schemas
- [@green-pulse/types](../types) - GreenPulse-specific types
- [web-green-pulse](../web) - Frontend application

## Deployment

### Render Configuration

```yaml
Build Command: pnpm install --frozen-lockfile --shamefully-hoist &&
  pnpm turbo build --filter=api-green-pulse

Start Command: cd apps/green-pulse/api && node dist/index.js

Environment:
  NODE_ENV=production
  PORT=10000
  # Add other env vars in Render dashboard
```

### Health Check

```
GET /api/health
Response: { "status": "ok" }
```

## Development Guidelines

1. **Use shared types** from `@ezstart/types` when possible
2. **Add OpenAPI descriptions** to all Zod schemas
3. **Validate all inputs** with Zod schemas
4. **Use JWT authentication** for protected routes
5. **Follow RESTful conventions** for endpoints
6. **Write descriptive error messages**

## Example: Adding a New Endpoint

```typescript
// routes/goals.ts
import { Router } from '@ezstart/api-core'
import { z } from '@ezstart/types'
import { authenticate } from '../middleware/auth'

const router = Router()

const createGoalSchema = z.object({
  target: z.number().min(0).describe('Target carbon reduction (kg CO2)'),
  deadline: z.string().datetime().describe('Goal deadline (ISO 8601)'),
})

router.post('/api/goals', authenticate, async (req, res) => {
  const data = createGoalSchema.parse(req.body)
  const goal = await Goal.create({ ...data, userId: req.user.id })
  res.status(201).json(goal)
})

export default router
```

## License

MIT © EZStart
