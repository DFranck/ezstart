# @ezstart/fetch-client

Type-safe HTTP client with automatic API URL resolution via @ezstart/config.

## Install

`pnpm add @ezstart/fetch-client`

## Usage

```typescript
import { createFetchClient } from '@ezstart/fetch-client'

const api = createFetchClient('ezauth')
const user = await api.get<User>('/users/me')
```

## Used by

- apps/ezbill, ezstart, gacha-analyzer, green-pulse (web)
- packages/ai-sdk
