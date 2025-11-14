# App-Specific Roles System - Documentation

## 📋 Vue d'ensemble

Système de rôles hiérarchique où **seul le superadmin** a accès cross-app. Tous les autres rôles (admin, manager, beta-tester, client) sont **app-specific**.

## 🎯 Architecture

### Hiérarchie des Rôles

```
┌─────────────────────────────────────────┐
│  Superadmin (Global - Cross-App)        │  ← Seul rôle global
├─────────────────────────────────────────┤
│  Admin (App-Specific)                   │
│  Manager (App-Specific)                 │
│  Beta-Tester (App-Specific)             │
│  Client (App-Specific)                  │
└─────────────────────────────────────────┘
```

### Structure de Données

#### Base de données (Mongoose)

```typescript
interface AuthUserDocument {
  // Nouveaux champs
  globalRoles: string[]              // ['superadmin'] uniquement
  appRoles: Map<string, string[]>    // { 'green-pulse': ['admin'], 'ezbill': ['beta-tester'] }

  // Ancien champ (déprécié mais conservé)
  roles: string[]                    // Pour compatibilité arrière
}
```

#### JWT Token

```typescript
{
  userId: string
  email: string
  // Nouveaux champs
  globalRoles: string[]
  appRoles: Record<string, string[]>  // Map converti en objet pour JSON
  // Ancien champ (déprécié)
  roles: string[]
}
```

## 🔧 Fichiers Modifiés

### 1. Modèle User ([apps/ezauth/api/src/models/auth-user.ts](../apps/ezauth/api/src/models/auth-user.ts))

**Nouvelles méthodes RBAC:**

```typescript
// Vérifier rôle global
hasGlobalRole(role: string): boolean

// Vérifier rôle app-specific
hasAppRole(appName: string, role: string): boolean

// Vérifier rôle (global OU app-specific)
hasRole(role: string, appName?: string): boolean

// Vérifier si a au moins un des rôles
hasAnyRole(roles: string[], appName?: string): boolean
```

**Logique de vérification:**

1. Si `role === 'superadmin'` → Vérifier `globalRoles`
2. Si `appName` fourni → Vérifier `appRoles[appName]`
3. Sinon → Vérifier si rôle existe dans **n'importe quelle** app

### 2. RBAC Package ([packages/rbac/src/client.ts](../packages/rbac/src/client.ts))

**Fonctions mises à jour:**

```typescript
// Toutes acceptent maintenant un paramètre appName optionnel
hasRole(user, role, appName?)
hasAnyRole(user, roles, appName?)
hasAllRoles(user, roles, appName?)
canManageUser(currentUser, targetUser, appName?)

// Hook React
useRBAC(user, appName?) // Injecte appName dans toutes les méthodes
```

**Exemple d'utilisation:**

```typescript
// Dans une page green-pulse
const rbac = useRBAC(user, 'green-pulse')

// Vérifie si admin de green-pulse
if (rbac.hasRole('admin')) {
  // Accès admin
}
```

### 3. Composant RequireRole ([packages/rbac/src/components/require-role.tsx](../packages/rbac/src/components/require-role.tsx))

**Nouvelle prop:**

```typescript
<RequireRole
  roles={['admin']}
  appName="green-pulse"  // ← Nouveau
>
  <AdminPanel />
</RequireRole>
```

### 4. JWT Generation ([apps/ezauth/api/src/services/auth.service.ts](../apps/ezauth/api/src/services/auth.service.ts))

**loginWithToken() et exchangeCodeForToken():**

```typescript
// Convertir Map → Object pour JWT
const appRolesObj: Record<string, string[]> = {}
if (user.appRoles) {
  user.appRoles.forEach((roles, appName) => {
    appRolesObj[appName] = roles
  })
}

const payload = {
  // ...autres champs
  globalRoles: user.globalRoles || [],
  appRoles: appRolesObj,
  roles: user.roles || [] // Backwards compat
}
```

### 5. Endpoints API

#### Update User ([apps/ezauth/api/src/routes/admin/update-user.ts](../apps/ezauth/api/src/routes/admin/update-user.ts))

**Nouvelle logique:**

- ✅ Seul **superadmin** peut modifier les users depuis ezstart
- ✅ Gère `globalRoles` et `appRoles`
- ✅ Convertit objet → Map pour Mongoose

```typescript
// Vérification
const isSuperAdmin = currentUser.globalRoles?.includes('superadmin') ||
                     currentUser.roles?.includes('superadmin')

// Update appRoles
const appRolesMap = new Map<string, string[]>()
Object.entries(req.body.appRoles).forEach(([app, roles]) => {
  appRolesMap.set(app, roles)
})
user.appRoles = appRolesMap
```

#### Invite Waitlist ([apps/ezauth/api/src/routes/admin/invite-waitlist.ts](../apps/ezauth/api/src/routes/admin/invite-waitlist.ts))

**Auto-grant avec app-specific roles:**

```typescript
// Ajouter beta-tester pour l'app spécifique
if (!existingUser.appRoles) {
  existingUser.appRoles = new Map()
}

const currentAppRoles = existingUser.appRoles.get(appName) || []
if (!currentAppRoles.includes('beta-tester')) {
  currentAppRoles.push('beta-tester')
  existingUser.appRoles.set(appName, currentAppRoles)
}
```

### 6. Admin Panel ([apps/ezstart/web/src/app/[locale]/(views)/admin/components/user-edit-modal.tsx](../apps/ezstart/web/src/app/[locale]/(views)/admin/components/user-edit-modal.tsx))

**Nouvelle UI:**

1. **Section Global Roles** - Superadmin uniquement
2. **Section Apps & App-Specific Roles** - Interface imbriquée:
   ```
   ☑ green-pulse
     ☑ admin
     ☐ manager
     ☑ beta-tester
     ☐ client

   ☑ ezbill
     ☐ admin
     ☐ manager
     ☑ beta-tester
     ☐ client
   ```

## 📝 Migration

### Script de Migration ([apps/ezauth/api/src/scripts/migrate-roles.ts](../apps/ezauth/api/src/scripts/migrate-roles.ts))

**Logique:**

```typescript
for (const user of users) {
  // Si a 'superadmin' → globalRoles
  if (user.roles.includes('superadmin')) {
    user.globalRoles = ['superadmin']
  }

  // Autres rôles → appRoles pour chaque app
  const otherRoles = user.roles.filter(r => r !== 'superadmin')
  if (otherRoles.length > 0) {
    user.appRoles = new Map()
    for (const app of user.apps) {
      user.appRoles.set(app, otherRoles)
    }
  }
}
```

**Exécution:**

```bash
cd apps/ezauth/api
node --loader ts-node/esm src/scripts/migrate-roles.ts
```

## 🧪 Tests

### Scénarios de Test

#### 1. Superadmin (Cross-App)

```typescript
// User
{
  globalRoles: ['superadmin'],
  appRoles: {},
  apps: ['ezstart', 'green-pulse', 'ezbill']
}

// Devrait avoir accès:
✅ Admin panel ezstart
✅ Admin panel green-pulse
✅ Gérer tous les users partout
✅ Modifier n'importe quel user
```

#### 2. Admin (App-Specific)

```typescript
// User
{
  globalRoles: [],
  appRoles: {
    'green-pulse': ['admin'],
    'ezbill': ['beta-tester']
  },
  apps: ['green-pulse', 'ezbill']
}

// Devrait avoir accès:
✅ Admin panel green-pulse
❌ Admin panel ezbill (seulement beta-tester)
✅ Gérer users de green-pulse
❌ Gérer users de ezbill
❌ Accéder à ezstart admin
```

#### 3. Beta-Tester (App-Specific)

```typescript
// User
{
  globalRoles: [],
  appRoles: {
    'green-pulse': ['beta-tester']
  },
  apps: ['green-pulse']
}

// Devrait avoir accès:
✅ Chat green-pulse
❌ Admin panel green-pulse
❌ Autres apps
```

## 🔒 Permissions

### Matrice d'Accès

| Action | Superadmin | Admin (app-specific) | Beta-Tester | Client |
|--------|-----------|---------------------|-------------|--------|
| Accès cross-app | ✅ | ❌ | ❌ | ❌ |
| Gérer users (sa app) | ✅ | ✅ | ❌ | ❌ |
| Gérer users (autre app) | ✅ | ❌ | ❌ | ❌ |
| Admin panel ezstart | ✅ | ❌ | ❌ | ❌ |
| Admin panel app | ✅ | ✅ (si admin de l'app) | ❌ | ❌ |
| Accès beta features | ✅ | ✅ | ✅ | ❌ |

## 📦 Compatibilité Arrière

### Ancien Champ `roles`

**Conservé pour:**
- Ne pas casser les anciennes versions
- Permettre migration progressive
- Fallback si nouveaux champs vides

**Sera déprécié:**
- Après migration complète
- Après validation du nouveau système
- Documentation mise à jour

### Vérification

```typescript
// Nouvelle logique
hasRole(role, appName) {
  // 1. Check globalRoles
  if (this.globalRoles?.includes(role)) return true

  // 2. Check appRoles
  if (appName && this.appRoles?.get(appName)?.includes(role)) return true

  // 3. FALLBACK: Check old roles field
  if (this.roles?.includes(role)) return true

  return false
}
```

## 🚀 Déploiement

### Étapes

1. **Déployer nouveau code** (avec compatibilité arrière)
2. **Exécuter migration** sur production
3. **Valider données** migrées
4. **Tester permissions** de chaque rôle
5. **Monitoring** logs/erreurs

### Rollback Plan

Si problème:
1. Le champ `roles` existe toujours
2. Anciens endpoints fonctionnent encore
3. Pas de breaking changes

## 📊 Monitoring

### Logs à Surveiller

```typescript
// Migration
console.log('✅ franckdufournetpro@gmail.com migrated')
console.log('   globalRoles: [superadmin]')
console.log('   appRoles[green-pulse]: [admin]')

// Auth
console.log('[RBAC] hasRole check:', {
  hasUser: true,
  globalRoles: ['superadmin'],
  appRoles: { 'green-pulse': ['admin'] },
  checkingRole: 'admin',
  appName: 'green-pulse'
})
```

## 🔍 Troubleshooting

### User n'a pas accès alors qu'il devrait

1. Vérifier JWT token contient `globalRoles` et `appRoles`
2. Vérifier user dans DB a les bons rôles
3. Check `RequireRole` a le bon `appName`
4. Logs RBAC pour debug

### Admin ne peut pas gérer users d'une app

1. Vérifier `appRoles` contient `admin` pour cette app
2. Check endpoint vérifie app-specific roles
3. Vérifier UI passe `appName` correct

### Migration échec

1. Check MongoDB connexion
2. Vérifier format `roles` existant
3. Check logs migration pour détails
4. Rollback si nécessaire (data intacte)

---

**Date de création:** 15 Novembre 2025
**Auteur:** Claude (avec franckdufournet)
**Status:** ✅ Implémenté - En attente migration production
