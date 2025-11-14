# @ezstart/rbac

Role-Based Access Control (RBAC) system for @ezstart monorepo.

## Features

- **5 Role Levels**: `superadmin`, `admin`, `manager`, `beta-tester`, `client`
- **Granular Permissions**: Theme editing, user management, analytics, content, etc.
- **Feature Flags**: Beta features, early access, advanced analytics
- **Client & Server**: Works in React and Express
- **Type-Safe**: Full TypeScript support

## Installation

```bash
pnpm add @ezstart/rbac
```

## Usage

### Client-Side (React/Next.js)

```tsx
import { useAuthStore } from '@ezstart/auth-sdk'
import { hasRole, hasPermission, hasFeature, useRBAC } from '@ezstart/rbac'

function AdminPanel() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  // Check role
  if (!rbac.hasRole('admin')) {
    return <div>Access Denied</div>
  }

  // Check permission
  if (rbac.hasPermission('users:manage')) {
    return <UserManagement />
  }

  // Check feature
  if (rbac.hasFeature('beta-features')) {
    return <BetaFeatures />
  }

  return <Dashboard />
}
```

### Server-Side (Express API)

```typescript
import { requireAuth, requireRole, requirePermission, requireFeature } from '@ezstart/rbac/server'

// Require authentication
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// Require specific role
app.get('/api/admin', requireRole('admin', 'superadmin'), (req, res) => {
  res.json({ message: 'Admin access granted' })
})

// Require permission
app.post('/api/users', requirePermission('users:manage'), (req, res) => {
  // Create user
})

// Require feature
app.get('/api/beta', requireFeature('beta-features'), (req, res) => {
  res.json({ betaContent: '...' })
})
```

## Roles Hierarchy

| Role         | Level | Description                      |
| ------------ | ----- | -------------------------------- |
| superadmin   | 100   | Full system access (you)         |
| admin        | 80    | App management                   |
| manager      | 60    | Client management                |
| beta-tester  | 40    | Access to beta features          |
| client       | 20    | Standard user                    |

## Default Permissions

### Superadmin
- All permissions (automatic)

### Admin
- `users:view`, `users:manage`
- `theme:edit`
- `analytics:view`
- `content:create`, `content:edit`, `content:publish`
- `org:view-members`

### Manager
- `users:view`
- `analytics:view`
- `content:create`, `content:edit`
- `org:view-members`

### Beta-Tester
- `content:create`

### Client
- No default permissions

## Default Features

### Superadmin
- All features (automatic)

### Admin
- `advanced-analytics`
- `custom-themes`
- `api-access`

### Manager
- `advanced-analytics`

### Beta-Tester
- `beta-features`
- `early-access`

### Client
- No default features

## API Reference

### Client Functions

```typescript
hasRole(user, role: Role): boolean
hasAnyRole(user, roles: Role[]): boolean
hasAllRoles(user, roles: Role[]): boolean

hasPermission(user, permission: Permission): boolean
hasAnyPermission(user, permissions: Permission[]): boolean
hasAllPermissions(user, permissions: Permission[]): boolean

hasFeature(user, feature: Feature): boolean
hasAnyFeature(user, features: Feature[]): boolean

canManageUser(currentUser, targetUser): boolean
getHighestRoleLevel(user): number
isRoleHigherThan(user, role: Role): boolean

useRBAC(user): RBACHook
```

### Server Middleware

```typescript
requireAuth(req, res, next)
requireRole(...roles: Role[])
requirePermission(...permissions: Permission[])
requireFeature(...features: Feature[])
canManageUser(req, targetUserId: string): boolean
```

## Examples

### Conditional Rendering

```tsx
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'

function App() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  return (
    <div>
      {rbac.hasRole('admin') && <AdminDashboard />}
      {rbac.hasPermission('theme:edit') && <ThemeEditor />}
      {rbac.hasFeature('beta-features') && <BetaSection />}
    </div>
  )
}
```

### Protected Routes

```typescript
import { requireRole } from '@ezstart/rbac/server'

router.get('/admin/users', requireRole('admin', 'superadmin'), async (req, res) => {
  const users = await getUsers()
  res.json(users)
})
```

### User Management

```typescript
import { canManageUser } from '@ezstart/rbac'

function UserList() {
  const { user } = useAuthStore()

  return users.map(u => (
    <UserCard
      user={u}
      canEdit={canManageUser(user, u)}
    />
  ))
}
```
