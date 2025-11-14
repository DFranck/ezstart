# 🔐 RBAC System - Role-Based Access Control

## Vue d'ensemble

Le système RBAC (@ezstart/rbac) permet de gérer les accès et permissions dans tout le monorepo @ezstart.

**Créé le:** 14 Novembre 2025
**Package:** `@ezstart/rbac`
**Database:** MongoDB (via EZAuth)

---

## 🎯 Hiérarchie des Rôles

| Rôle         | Niveau | Description                           | Cas d'usage                          |
| ------------ | ------ | ------------------------------------- | ------------------------------------ |
| superadmin   | 100    | Accès total au système                | Vous (propriétaire)                  |
| admin        | 80     | Gestion d'applications spécifiques    | Gérants d'apps                       |
| manager      | 60     | Gestion de clients                    | Gestionnaires de clients             |
| beta-tester  | 40     | Accès features beta                   | Testeurs early-access                |
| client       | 20     | Utilisateur standard                  | Clients finaux                       |

**Règle clé:** Superadmin a TOUS les droits automatiquement (permissions + features)

---

## 🔑 Permissions par Défaut

### Superadmin
- **Tout** (automatique)

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
- Aucune permission par défaut

---

## 🎁 Features par Défaut

### Superadmin
- Toutes les features (automatique)

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
- Aucune feature par défaut

---

## 📦 Installation

Le package est déjà dans le monorepo. Ajoutez-le à votre app :

```json
// apps/[your-app]/web/package.json
{
  "dependencies": {
    "@ezstart/rbac": "workspace:*"
  }
}
```

```bash
pnpm install
```

---

## 🚀 Quick Start

### 1. Donner le rôle Superadmin (MongoDB Compass)

**PREMIÈRE FOIS SEULEMENT** - Vous donner le rôle superadmin :

1. Ouvrez **MongoDB Compass**
2. Connectez-vous à `mongodb://localhost:27017`
3. Database: `ezauth`
4. Collection: `auth_users`
5. Trouvez votre utilisateur (par email)
6. Cliquez "Edit Document"
7. Ajoutez/modifiez ces champs :

```json
{
  "roles": ["superadmin"],
  "permissions": [],
  "features": []
}
```

8. Cliquez "Update"
9. **Déconnectez-vous et reconnectez-vous** pour rafraîchir le token

### 2. Utiliser le Panel Admin (Interface Web)

Une fois que vous êtes superadmin :

1. Allez sur **http://localhost:5005/admin** (EZStart web)
2. Vous verrez le panel admin avec la liste des utilisateurs
3. Cliquez "Edit" sur un utilisateur
4. Cochez les rôles, apps, etc.
5. Cliquez "Save Changes"

**Le panel admin permet de :**
- ✅ Voir tous les utilisateurs
- ✅ Assigner des rôles (admin, manager, beta-tester, client)
- ✅ Donner accès aux apps (ezbill, green-pulse, etc.)
- ✅ Voir les permissions/features héritées des rôles
- ✅ Vérifier les emails
- ✅ Filtrer et rechercher

---

## 💻 Usage dans le Code

### Client-Side (React/Next.js)

```tsx
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC, hasRole, hasPermission, hasFeature } from '@ezstart/rbac'

function AdminPanel() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  // Vérifier rôle
  if (!rbac.hasRole('admin')) {
    return <div>Access Denied</div>
  }

  // Vérifier permission
  if (rbac.hasPermission('users:manage')) {
    return <UserManagement />
  }

  // Vérifier feature
  if (rbac.hasFeature('beta-features')) {
    return <BetaSection />
  }

  // Plusieurs rôles
  if (rbac.hasAnyRole(['admin', 'superadmin'])) {
    return <AdminDashboard />
  }
}
```

### Conditional Rendering

```tsx
import { ThemeEditor } from '@ezstart/ui/components'

function Header() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  return (
    <header>
      {/* Visible uniquement pour admin/superadmin */}
      {rbac.hasAnyRole(['admin', 'superadmin']) && (
        <ThemeEditor adminOnly={true} enableHistory={true} />
      )}

      {/* Visible uniquement si permission theme:edit */}
      {rbac.hasPermission('theme:edit') && (
        <CustomThemeButton />
      )}

      {/* Visible uniquement si feature beta */}
      {rbac.hasFeature('beta-features') && (
        <BetaFeaturesBadge />
      )}
    </header>
  )
}
```

### Server-Side (Express API)

```typescript
import { requireAuth, requireRole, requirePermission, requireFeature } from '@ezstart/rbac/server'

// Require authentification
app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// Require role admin OU superadmin
app.get('/api/admin/dashboard', requireRole('admin', 'superadmin'), (req, res) => {
  res.json({ message: 'Admin dashboard' })
})

// Require permission
app.post('/api/users', requirePermission('users:manage'), (req, res) => {
  // Create user
})

// Require feature
app.get('/api/beta/features', requireFeature('beta-features'), (req, res) => {
  res.json({ betaContent: '...' })
})
```

---

## 🔧 API Endpoints

### GET /api/admin/users

Liste tous les utilisateurs (avec pagination et filtres)

**Access:** superadmin, admin

**Query params:**
- `page` (default: 1)
- `limit` (default: 50)
- `search` (email, username, name)
- `role` (filter by role)

**Response:**
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 123,
    "totalPages": 3
  }
}
```

### GET /api/admin/users/:id

Récupère les détails d'un utilisateur

**Access:** superadmin, admin

### PATCH /api/admin/users/:id

Met à jour un utilisateur (rôles, permissions, features, apps)

**Access:** superadmin, admin

**Body:**
```json
{
  "roles": ["admin", "beta-tester"],
  "permissions": ["custom:permission"],
  "features": ["custom:feature"],
  "apps": ["ezbill", "green-pulse"],
  "isVerified": true
}
```

**Restrictions:**
- Seul superadmin peut modifier d'autres superadmins
- Seul superadmin peut donner le rôle superadmin
- Admin peut seulement gérer des users dans ses apps

---

## 📋 Cas d'Usage Courants

### 1. Restreindre une page admin

```tsx
// apps/your-app/web/src/app/admin/page.tsx
'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore()
  const rbac = useRBAC(user)

  if (!isAuthenticated) {
    return <div>Please login</div>
  }

  if (!rbac.hasAnyRole(['admin', 'superadmin'])) {
    return <div>Access Denied - Admin Only</div>
  }

  return <AdminDashboard />
}
```

### 2. Restreindre un composant

```tsx
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'

export function DeleteButton({ itemId }: { itemId: string }) {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  if (!rbac.hasPermission('content:delete')) {
    return null // Hide button
  }

  return <Button onClick={() => deleteItem(itemId)}>Delete</Button>
}
```

### 3. Afficher features beta

```tsx
import { useAuthStore } from '@ezstart/auth-sdk'
import { useRBAC } from '@ezstart/rbac'

export function Dashboard() {
  const { user } = useAuthStore()
  const rbac = useRBAC(user)

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Tous les users */}
      <StandardFeatures />

      {/* Seulement beta-testers et admins */}
      {rbac.hasFeature('beta-features') && (
        <BetaFeatures />
      )}

      {/* Seulement admins */}
      {rbac.hasFeature('advanced-analytics') && (
        <AdvancedAnalytics />
      )}
    </div>
  )
}
```

### 4. Protéger une route API

```typescript
// apps/your-app/api/src/routes/admin.ts
import { Router } from 'express'
import { requireRole, requirePermission } from '@ezstart/rbac/server'

const router = Router()

// Seulement admin/superadmin
router.get('/users', requireRole('admin', 'superadmin'), (req, res) => {
  // List users
})

// Seulement avec permission users:delete
router.delete('/users/:id', requirePermission('users:delete'), (req, res) => {
  // Delete user
})

export default router
```

---

## 🎨 ThemeEditor avec RBAC

Le `ThemeEditor` supporte maintenant le système RBAC :

```tsx
import { ThemeEditor } from '@ezstart/ui/components'

// Visible uniquement pour users avec:
// - Rôle: admin OU superadmin
// - OU Permission: theme:edit
<ThemeEditor adminOnly={true} enableHistory={true} />

// Visible pour tous
<ThemeEditor adminOnly={false} enableHistory={true} />
```

**Implementation automatique:**
- Le ThemeEditor vérifie automatiquement `user.roles` et `user.permissions`
- Si `adminOnly={true}` ET pas admin/theme:edit → composant caché
- Fonctionne avec le store Zustand global (`window.__ezauth_store__`)

---

## 🛠️ Ajouter des Permissions/Features Custom

### Dans le code

```typescript
// Vérifier permission custom
if (rbac.hasPermission('invoices:export')) {
  // Allow export
}

// Vérifier feature custom
if (rbac.hasFeature('premium-support')) {
  // Show premium support button
}
```

### Dans l'admin panel

1. Allez sur http://localhost:5005/admin
2. Edit user
3. Les permissions/features custom ne sont pas encore dans l'UI
4. Pour l'instant, ajoutez-les via MongoDB Compass ou API directement

**TODO:** Ajouter UI pour permissions/features custom dans le modal

---

## 📊 Structure MongoDB

```json
{
  "_id": "user_id",
  "email": "user@example.com",
  "username": "john",
  "roles": ["admin", "beta-tester"],
  "permissions": ["custom:permission"],
  "features": ["custom:feature"],
  "apps": ["ezbill", "green-pulse"],
  "organizationId": "org_123",
  "managedBy": "manager_user_id",
  "isVerified": true,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## ⚠️ Important - Sécurité

### Règles de gestion

1. **Seul superadmin peut :**
   - Modifier d'autres superadmins
   - Donner le rôle superadmin
   - Tout voir et tout faire

2. **Admin peut :**
   - Gérer users dans ses apps
   - Ne peut PAS modifier les superadmins
   - Ne peut PAS donner le rôle superadmin

3. **Manager peut :**
   - Gérer users qu'il a créé (`managedBy`)

### Première connexion

Après avoir ajouté le rôle superadmin dans MongoDB :
1. **Déconnectez-vous** de toutes les apps
2. **Reconnectez-vous** pour obtenir un nouveau token avec les rôles
3. Le token JWT contient les rôles mais N'EST PAS mis à jour automatiquement

---

## 🔄 Migration d'utilisateurs existants

Si vous avez déjà des utilisateurs dans votre database :

```javascript
// Script MongoDB (exécuter dans Compass)
db.auth_users.updateMany(
  {}, // Tous les users
  {
    $set: {
      roles: [],
      permissions: [],
      features: []
    }
  }
)

// Puis donner superadmin à votre user
db.auth_users.updateOne(
  { email: "votre@email.com" },
  {
    $set: {
      roles: ["superadmin"]
    }
  }
)
```

---

## 📚 Ressources

- **Package RBAC:** [packages/rbac/README.md](../packages/rbac/README.md)
- **Admin Panel:** http://localhost:5005/admin
- **API Docs:** http://localhost:5000/api (EZStart Monitoring API)
- **Auth SDK:** [packages/auth-sdk/](../packages/auth-sdk/)

---

## 🐛 Troubleshooting

### "Access Denied" même après avoir ajouté le rôle

**Solution:** Déconnectez-vous et reconnectez-vous. Le token JWT doit être rafraîchi.

### Admin panel ne charge pas

**Solution:**
1. Vérifiez que EZStart API tourne (`pnpm dev`)
2. Vérifiez l'URL API dans `.env.local`
3. Vérifiez que vous êtes authentifié

### Cannot manage other users

**Solution:**
- Vérifiez que vous avez le rôle `admin` ou `superadmin`
- Admins ne peuvent gérer que users dans leurs apps
- Superadmin peut tout gérer

### ThemeEditor still showing for non-admins

**Solution:**
1. Vérifiez que `adminOnly={true}`
2. Vérifiez que le user a bien le rôle dans MongoDB
3. Déconnectez/reconnectez pour rafraîchir le token
4. Vérifiez la console pour voir les logs de vérification

---

**Questions ?** Consultez [packages/rbac/README.md](../packages/rbac/README.md) pour plus de détails.
