# 🤖 AI Agent Quick Reference - @ezstart

**Référence rapide pour agents IA travaillant sur le monorepo @ezstart**

---

## 🚀 Démarrage Rapide (5 min)

### 1. Ordre de Lecture OBLIGATOIRE

```
1. CLAUDE.md          (5 min)  → Vue d'ensemble + quick start
2. DEV-RULES.md       (10 min) → Règles obligatoires
3. docs/README.md     (5 min)  → Scores audits actuels
4. docs/ROADMAP.md    (5 min)  → Priorités du moment
```

### 2. Documentation Détaillée (selon besoin)

```
Pour comprendre le cycle d'amélioration:
└─→ docs/AI-AGENT-CYCLE.md (15 min)

Pour un domaine spécifique:
└─→ docs/audits/[DOMAIN]-AUDIT.md

Pour un package:
└─→ packages/[name]/README.md
```

---

## 🔄 Cycle en 5 Phases (Résumé)

```
┌──────────────────────────────────────────┐
│  CYCLE VERTUEUX D'AMÉLIORATION CONTINUE  │
└──────────────────────────────────────────┘

1️⃣ ANALYSE (15 min)
   ├─ Lire CLAUDE.md, DEV-RULES.md
   ├─ Identifier la demande
   ├─ Chercher code existant
   └─ Vérifier audits concernés
       ↓
2️⃣ PLANIFICATION (10 min)
   ├─ Créer plan d'action
   ├─ Lister fichiers impactés
   ├─ Définir stratégie tests
   └─ Identifier documentation
       ↓
3️⃣ EXÉCUTION (60-120 min)
   ├─ Suivre standards (DEV-RULES.md)
   ├─ Créer tests en parallèle
   ├─ TypeCheck + Lint + Build
   └─ Vérifier pas de régression
       ↓
4️⃣ DOCUMENTATION (15 min)
   ├─ README packages si modifiés
   ├─ DEV-RULES.md si règle nouvelle
   ├─ Audit si impact score
   └─ Commit structuré
       ↓
5️⃣ VALIDATION (10 min)
   ├─ Tous les checks passent
   ├─ Score audit amélioré
   ├─ Tests de régression créés
   └─ Rapport si changement majeur
```

---

## ✅ Checklist Ultra-Rapide

### Avant de commencer
- [ ] J'ai lu CLAUDE.md
- [ ] J'ai lu DEV-RULES.md
- [ ] Je connais les règles applicables
- [ ] J'ai cherché si code existe déjà

### Pendant l'implémentation
- [ ] Je suis les standards (pas de HTML natif, couleurs sémantiques)
- [ ] Je crée les tests EN MÊME TEMPS
- [ ] TypeCheck passe à chaque étape
- [ ] Pas de duplication de code

### Avant de commit
- [ ] README(s) mis à jour (packages modifiés)
- [ ] DEV-RULES.md mis à jour (règle nouvelle)
- [ ] Audit mis à jour (impact score)
- [ ] Tests passent tous
- [ ] TypeCheck + Lint + Build OK

---

## 🚨 Règles Critiques (JAMAIS enfreindre)

### UI/UX
```tsx
❌ JAMAIS: <div>, <button>, <input>, bg-gray-100
✅ TOUJOURS: <Card>, <Button>, <Input>, bg-card
```

### Configuration
```typescript
❌ JAMAIS: hardcoder URLs/ports
✅ TOUJOURS: getApiUrl(), getWebUrl() depuis @ezstart/config
```

### MongoDB
```typescript
❌ JAMAIS: mongoose.connect(URL)
✅ TOUJOURS: connectToMongo('db-name') depuis @ezstart/express-core
```

### Tests
```typescript
❌ JAMAIS: lancer tests sans .env.test
✅ TOUJOURS: createVitestConfig({ dbName }) + .env.test
```

---

## 📊 Priorités Actuelles (Score Global: 84.8/100)

### 🟢 Excellent (95-100)
- Architecture 95
- Web Apps 95
- Code Quality 92

### 🟡 À Améliorer (78-90)
- API 78 → Besoin OpenAPI + rate limiting
- Monitoring 80 → Besoin alerting
- UX 80 → Besoin error handling + mobile

### 🎯 Focus Phase 3
1. UX Excellence (80 → 90)
2. Performance (82 → 90)
3. Accessibility (88 → 95)

**Voir [docs/ROADMAP.md](./ROADMAP.md) pour détails**

---

## 🛠️ Commandes Essentielles

### Vérifications Qualité
```bash
pnpm typecheck    # TypeScript errors
pnpm lint         # ESLint issues
pnpm build        # Build all packages
pnpm test         # Run all tests
```

### Développement
```bash
pnpm dev:types    # TypeScript watch (Terminal 1)
pnpm dev          # All servers (Terminal 2)

# Ou mode ciblé:
pnpm dev:ez       # EZStart + Monitoring
pnpm dev:bill     # EZBill + EZAuth
pnpm dev:gp       # GreenPulse + EZAuth
```

### Tests
```bash
pnpm test                    # Tous les tests
pnpm --filter [api] test     # Tests d'une API
pnpm test -- --coverage      # Avec coverage
```

### Recherche Code
```bash
rg "pattern" packages/       # Chercher dans packages
rg "component" apps/*/web/   # Chercher dans web apps
```

---

## 📁 Hiérarchie de Code (Où créer quoi?)

```
Avant de créer du code, CHERCHER dans cet ordre:

1️⃣ packages/              → Code réutilisable ENTRE projets
   ├─ types/             → Types communs
   ├─ utils/             → Utils génériques
   ├─ ui/                → Composants UI
   ├─ config/            → URLs, CORS, ports
   └─ express-core/      → Infrastructure API

2️⃣ apps/[project]/shared  → Code partagé web+api DU PROJET
   ├─ types/             → Types projet
   ├─ utils/             → Utils projet
   └─ config/            → Config projet

3️⃣ apps/[project]/web|api → Code SPÉCIFIQUE à une couche
   └─ EN DERNIER RECOURS uniquement!
```

---

## 🎨 Patterns Standards

### Composant UI
```tsx
import { Card, H2, Button } from '@ezstart/ui/components'

export function MyComponent() {
  return (
    <Card variant="floating">
      <CardHeader>
        <H2 size="h3">Title</H2>
      </CardHeader>
      <CardContent>
        <Button variant="primary">Action</Button>
      </CardContent>
    </Card>
  )
}
```

### API Route
```typescript
import { createApp, connectToMongo, startServer } from '@ezstart/express-core'

const app = createApp({ apiApp: 'ezauth' })
const PORT = getApiPort('ezauth')

app.use('/api/auth', authRoutes)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

connectToMongo('ezauth')
  .then(() => startServer(app, { routes, registries, serviceName, port }))
  .catch(err => process.exit(1))
```

### Model MongoDB
```typescript
import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

const userSchema = new Schema({...}, { bufferCommands: false })

export async function getUserModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.User || mongoose.model('User', userSchema)
}
```

### Test
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Title')).toBeInTheDocument()
  })
})
```

---

## 📈 Impact Mesurable

### Métriques à Suivre

| Métrique | Comment mesurer |
|----------|-----------------|
| **Score Audit** | docs/README.md → Avant/Après |
| **Tests** | `pnpm test -- --coverage` |
| **TypeScript** | `pnpm typecheck` |
| **Build** | `pnpm build` |
| **Bundle Size** | Next.js build output |

### Bon Cycle vs Mauvais Cycle

```
🟢 BON CYCLE (Vertueux)
├─ ✅ Root cause identifiée
├─ ✅ Solution qui prévient régressions
├─ ✅ Tests ajoutés
├─ ✅ Documentation à jour
├─ ✅ Règle créée si pattern nouveau
└─ ✅ Score audit amélioré (+X points)

🔴 MAUVAIS CYCLE (Vicieux)
├─ ❌ Quick fix sans comprendre
├─ ❌ Pas de tests
├─ ❌ Pas de documentation
├─ ❌ Pas de règle
└─ ❌ Problème pourrait réapparaître
```

---

## 🎯 KPIs par Cycle

| Indicateur | Cible | Mesure |
|------------|-------|--------|
| Score Audit | +1 à +5 | docs/README.md |
| Tests Ajoutés | ≥ 1 | Coverage report |
| Doc à Jour | 100% | Checklist |
| Régressions | 0 | Tests passent |
| Temps/Cycle | 1-4h | Estimation |

---

## 🆘 Troubleshooting Rapide

### Port Already in Use
```bash
pnpm kill:ports
# Ou redémarrer VS Code
```

### TypeScript Errors
```bash
pnpm install
pnpm --filter @ezstart/[package] build
pnpm dev:types
```

### CORS Errors
```typescript
// API: Vérifier createApp
const app = createApp({ apiApp: 'ezauth' })

// Web: Vérifier getApiUrl
const API_URL = getApiUrl('ezauth')
```

### Tests Failing
```bash
# Vérifier .env.test existe
cat apps/[api]/api/.env.test

# Relancer tests
pnpm --filter api-[name] test
```

---

## 📚 Liens Rapides

### Documentation
- 🤖 [AI-AGENT-CYCLE.md](./AI-AGENT-CYCLE.md) - Guide complet
- 📐 [DEV-RULES.md](../DEV-RULES.md) - Règles obligatoires
- 📊 [docs/README.md](./README.md) - Dashboard audits
- 🎯 [ROADMAP.md](./ROADMAP.md) - Priorités

### Audits Clés
- [UX-AUDIT.md](./audits/UX-AUDIT.md) - Score 80/100
- [API-AUDIT.md](./audits/API-AUDIT.md) - Score 78/100
- [MONITORING-AUDIT.md](./audits/MONITORING-AUDIT.md) - Score 80/100

### Packages Importants
- [packages/ui/README.md](../packages/ui/README.md) - Composants UI
- [packages/config/README.md](../packages/config/README.md) - URLs/CORS
- [packages/express-core/README.md](../packages/express-core/README.md) - Infrastructure API

---

## 💡 Tips Productivité

### Recherche Efficace
```bash
# Trouver tous les usages d'un pattern
rg "getApiUrl" apps/

# Trouver un composant
rg "export.*Button" packages/ui/

# Trouver tests
rg "describe.*Button" packages/
```

### Navigation Rapide
```bash
# Aller au score global
cat docs/README.md | grep "Global Score"

# Voir les règles UI
cat DEV-RULES.md | grep -A 20 "🎨 UI/UX"

# Voir la roadmap
cat docs/ROADMAP.md | head -50
```

### Validation Rapide
```bash
# One-liner qualité
pnpm typecheck && pnpm lint && pnpm build && pnpm test

# Vérifier un package
pnpm --filter @ezstart/ui typecheck && \
pnpm --filter @ezstart/ui build && \
pnpm --filter @ezstart/ui test
```

---

## 🎓 Pour Aller Plus Loin

**Après avoir maîtrisé cette référence:**

1. ✅ Lire [AI-AGENT-CYCLE.md](./AI-AGENT-CYCLE.md) en détail
2. ✅ Explorer les audits spécifiques au domaine
3. ✅ Étudier les packages existants comme exemples
4. ✅ Contribuer à améliorer cette documentation!

**L'objectif:** Chaque intervention élève le niveau du projet. 🚀

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
