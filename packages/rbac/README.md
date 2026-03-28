# @ezstart/rbac

Role-Based Access Control (RBAC) system for permissions and role management.

## Install

`pnpm add @ezstart/rbac`

## Usage

```typescript
import { can, ROLES } from '@ezstart/rbac'
import { RBACProvider } from '@ezstart/rbac/client'
import { requireRole } from '@ezstart/rbac/server'
```

## Used by

- apps/ezbill, ezstart, green-pulse (web)
- apps/ezauth (api)
