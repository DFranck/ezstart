# @ezstart/config

Single source of truth for URLs, ports, domains, and CORS across the monorepo.

## Purpose

Centralizes all environment-aware configuration so no app or package hardcodes URLs or ports. Provides the dev server launcher used by all apps.

## Tech Stack

- TypeScript, dotenv

## Architecture

```
config/src/
├── urls.ts         # getApiUrl(), getWebUrl(), getApiPort()
├── cors.ts         # getCorsOrigins() — auto-configured per app
├── env.ts          # getEnv() — environment detection
├── cli/            # CLI utilities
└── dev-server.js   # Shared dev server launcher for all web apps
```

## Usage

```typescript
// Get URLs (auto-switches local/production)
import { getApiUrl, getWebUrl, getApiPort } from '@ezstart/config'

const API = getApiUrl('ezauth') // localhost:6110 or production URL
const PORT = getApiPort('ezbill') // 6120

// CORS origins for an API
import { getCorsOrigins } from '@ezstart/config/cors'
```

## Port Map

| App            | API  | Web  |
| -------------- | ---- | ---- |
| EZStart        | 6100 | 6101 |
| EZAuth         | 6110 | 6111 |
| EZBill         | 6120 | 6121 |
| EZPay          | 6130 | 6131 |
| ASC-TCD        | --   | 6141 |
| FengShui       | --   | 6151 |
| GreenPulse     | 6160 | 6161 |
| Gacha Analyzer | 6170 | 6171 |

## Used By

All apps and most packages.
