# @ezstart/config

Single source of truth for all URLs, ports, domains, and CORS across the monorepo.

## Install

`pnpm add @ezstart/config`

## Usage

```typescript
import { getApiUrl, getWebUrl } from '@ezstart/config/urls'
import { getCorsOrigins } from '@ezstart/config/cors'
import { getEnv } from '@ezstart/config/env'
```

## Used by

All apps and most packages. Replaces hardcoded URLs and env-based URL config everywhere.
