# Guide de Contribution — @ezstart Monorepo

Ce guide couvre les conventions, flows et regles pour contribuer au monorepo. Lisez-le en entier avant votre premier commit.

---

## Table des matieres

1. [Hierarchie des Composants](#hierarchie-des-composants)
2. [Pipeline de Developpement](#pipeline-de-developpement)
3. [Regles Essentielles](#regles-essentielles)
4. [Ajouter un Composant UI](#ajouter-un-composant-ui)
5. [Ajouter une Feature](#ajouter-une-feature)
6. [Ajouter un Endpoint API](#ajouter-un-endpoint-api)
7. [Data Fetching (React Query)](#data-fetching-react-query)
8. [i18n — Internationalisation](#i18n--internationalisation)
9. [Fichiers d'Environnement](#fichiers-denvironnement)
10. [Protection des Donnees (MongoDB)](#protection-des-donnees-mongodb)
11. [Git & Branches](#git--branches)
12. [Ports & Commandes](#ports--commandes)

---

## Hierarchie des Composants

```
packages/ui            (generique, reutilisable par TOUS les projets)
  --> packages/*-sdk   (metier, consomme ui)
    --> apps/          (specifique, consomme sdk + ui)
```

**Exemples concrets :**

| Couche              | Exemples                                                                       |
| ------------------- | ------------------------------------------------------------------------------ |
| `packages/ui`       | `Button`, `DataTable`, `Card`, `H1`, `P`, `Input`, `Badge`, `Icon`, `Skeleton` |
| `packages/pay-sdk`  | `PurchaseButton` (utilise `Button`), `DonationWall` (utilise `Card`, `Icon`)   |
| `packages/auth-sdk` | `AuthGuard`, `LoginForm` (utilise `Input`, `Button`)                           |
| `apps/ezpay/web`    | Pages qui importent `PurchaseButton`, `DonationWall` depuis pay-sdk            |
| `apps/ezbill/web`   | `InvoiceForm` (composant metier specifique a ezbill, utilise `Input`, `Card`)  |

**Regle d'or : ou placer mon code ?**

```
1. Existe dans packages/ ?           --> l'utiliser tel quel
2. Reutilisable par 2+ apps ?        --> le creer dans packages/
3. Partage entre web + api du projet ? --> apps/[projet]/types/ ou utils/
4. Specifique a une couche ?          --> apps/[projet]/web/ ou api/ (dernier recours)
```

---

## Pipeline de Developpement

Chaque contribution suit ce flow. Le pre-commit hook bloque automatiquement les violations.

```
1. Plan      Lire le code existant, proposer un plan
     |
2. Track     Mettre a jour BACKLOG.md, creer des issues si necessaire
     |
3. Code      Respecter les coding-rules (voir section Regles)
     |
4. Validate  pnpm typecheck (tsc --noEmit) — BLOQUANT
     |         grep secrets — BLOQUANT
     |
5. Track     Mettre a jour issues, documenter les tests
     |
6. Test      vitest run + tests navigateur
     |
7. Audit     Qualite code, i18n, UX, securite
     |
8. PR        Branch + gh pr create — JAMAIS push direct sur master
```

**Avant chaque commit, le pre-commit hook verifie automatiquement :**

- `tsc --noEmit` passe sans erreur
- Pas de secrets dans les fichiers stages

Si le hook echoue, le commit est **refuse**. Corrigez d'abord, committez ensuite.

---

## Regles Essentielles

### Ce qu'on NE FAIT JAMAIS

| Interdit                              | Pourquoi                      | A la place                                          |
| ------------------------------------- | ----------------------------- | --------------------------------------------------- |
| `<div>`, `<p>`, `<table>`, `<button>` | HTML natif non theme          | `Card`, `P`, `DataTable`, `Button` de `@ezstart/ui` |
| `console.log` / `console.error`       | Pas de niveaux, pas de format | `logger.debug/info/warn/error` de `@ezstart/logger` |
| `fetch()` / `axios` direct            | Pas de config CORS/auth       | `callApi` depuis `src/config/api.ts`                |
| `useState` + `useEffect` + `fetch`    | Pas de cache, pas de retry    | `useQuery` / `useMutation` (React Query)            |
| `alert()` / `window.confirm`          | UX cassee                     | `toast` (sonner) / `AlertDialog`                    |
| Texte hardcode en UI                  | Pas de traduction             | `t('cle')` via `next-intl`                          |
| `bg-gray-100`, `text-indigo-500`      | Casse le dark mode            | `bg-card`, `text-foreground`, `bg-primary`          |
| Composant custom dans `apps/`         | Duplication                   | Creer dans `packages/ui` avec variants              |
| `any` en TypeScript                   | Pas de type safety            | Typage explicite                                    |
| `deleteMany({})` sans guard           | Risque suppression prod       | Guard `NODE_ENV !== 'test'`                         |
| Push direct sur `master`              | Pas de review                 | Branch + PR                                         |

### Ce qu'on FAIT TOUJOURS

| Obligatoire                                       | Exemple                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| Importer UI depuis `@ezstart/ui/components`       | `import { Button, Card, H1 } from '@ezstart/ui/components'`             |
| `DataTable` pour toute liste/tableau              | TanStack-based, tri/filtre/pagination inclus                            |
| React Query pour tout fetch                       | `useQuery({ queryKey: ['users'], queryFn: fetchUsers })`                |
| `callApi` pour tous les appels API                | `const { data } = await callApi('/endpoint', { method: 'GET' })`        |
| `next-intl` pour tout texte visible               | `const t = useTranslations('invoice'); t('created')`                    |
| Zod pour valider les inputs API                   | `const parsed = schema.parse(req.body)`                                 |
| `sendSuccess` / `sendError` pour les reponses API | `sendSuccess(res, { data, meta })`                                      |
| Pagination sur tout endpoint liste                | `limit` (defaut 20) + `offset`, retour `meta: { total, limit, offset }` |
| Couleurs semantiques                              | `bg-card`, `text-foreground`, `bg-primary`, `text-destructive`          |
| Loading/error/empty states                        | Skeleton au chargement, retry sur erreur, message si vide               |
| Toast via sonner pour le feedback                 | `toast.success(t('invoice.created'))`                                   |
| `formatCurrency` pour les montants                | Jamais de formatage manuel                                              |
| `tsc --noEmit` avant commit                       | Automatique via pre-commit hook                                         |
| Fonctions < 50 lignes, composants < 300 lignes    | Extraire des helpers/sous-composants si depasse                         |

---

## Ajouter un Composant UI

```
1. Verifier si existe dans packages/ui
   --> oui ? L'utiliser directement
   --> non ? Continuer

2. Besoin generique (utilisable par plusieurs apps) ?
   --> Ajouter dans packages/ui/ avec variants
   --> Exemple : Card variant="premium"

3. Besoin metier (specifique a un domaine) ?
   --> Ajouter dans le SDK concerne
   --> Exemple : PurchaseButton dans packages/pay-sdk

4. Importer dans l'app
   import { Card } from '@ezstart/ui/components'
   import { PurchaseButton } from '@ezstart/pay-sdk'
```

**Nouveau design = nouvelle variant, JAMAIS un override local :**

```tsx
// packages/ui/src/components/Card.tsx
// Ajouter la variant ici
<Card variant="floating" />    // "default" | "floating" | "ghost" | "elevated" | "premium"
<Button variant="destructive" size="sm" />
```

---

## Ajouter une Feature

```
1. Creer une branche
   git checkout -b feat/ma-feature

2. API — Route action-based dans apps/[app]/api/src/routes/
   routes/payments/
   ├── createPayment.ts      # POST /payments
   ├── listPayments.ts       # GET /payments
   ├── getPaymentById.ts     # GET /payments/:id
   └── index.ts              # Feature router

3. Web — Page dans apps/[app]/web/src/app/[locale]/
   [locale]/payments/page.tsx

4. i18n — Messages FR + EN
   messages/fr/payments.json
   messages/en/payments.json

5. Tests — Mettre a jour E2E-TESTS.md

6. PR
   gh pr create --title "feat(ezpay): add payment history"
```

---

## Ajouter un Endpoint API

**1 fichier = 1 action** (action-based routing) :

```
routes/invoices/
├── createInvoice.ts     # POST
├── listInvoices.ts      # GET collection
├── getInvoiceById.ts    # GET single
├── updateInvoice.ts     # PATCH
├── deleteInvoice.ts     # DELETE
└── index.ts             # Assemble le router
```

**Exemple complet — `listInvoices.ts` :**

```typescript
import { Router } from '@ezstart/api-core'
import { z } from 'zod'
import { sendSuccess, sendError } from '@ezstart/api-core'
import { Invoice } from '../../models/Invoice.js'

const querySchema = z.object({
  limit: z.coerce.number().default(20),
  offset: z.coerce.number().default(0),
})

export const listInvoicesRouter = Router()
listInvoicesRouter.get('/', async (req, res) => {
  const { limit, offset } = querySchema.parse(req.query)
  const [data, total] = await Promise.all([
    Invoice.find().skip(offset).limit(limit),
    Invoice.countDocuments(),
  ])
  sendSuccess(res, { data, meta: { total, limit, offset } })
})
```

**Checklist endpoint :**

- [ ] Zod schema sur tous les inputs (body, query, params)
- [ ] `sendSuccess` / `sendError` pour les reponses
- [ ] Pagination (`limit` + `offset` + `meta`) sur les listes
- [ ] Rate limiting sur les endpoints sensibles
- [ ] Route prefixee `/api/`

---

## Data Fetching (React Query)

**Setup standard dans chaque app web :**

```tsx
// QueryProvider avec staleTime: 5min, gcTime: 10min, retry: 1
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

**Conventions queryKey :**

```typescript
;['invoices'][('invoice', id)][('invoices', { page, limit })] // Liste // Item // Liste paginee
```

**Pattern standard :**

```typescript
// Lecture
const { data, isLoading } = useQuery({
  queryKey: ['invoices'],
  queryFn: () => callApi('/api/invoices'),
})

// Ecriture
const mutation = useMutation({
  mutationFn: body => callApi('/api/invoices', { method: 'POST', body }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
})

// Conditionnel
useQuery({
  queryKey: ['invoice', id],
  queryFn: () => callApi(`/api/invoices/${id}`),
  enabled: !!id,
})
```

---

## i18n — Internationalisation

**Tout texte visible par l'utilisateur DOIT passer par `next-intl`.**

```tsx
const t = useTranslations('invoice')

// Labels, boutons, titres
<H1>{t('title')}</H1>
<Button>{t('submit')}</Button>

// Toasts
toast.success(t('created'))

// Placeholders
<Input placeholder={t('searchPlaceholder')} />
```

**Fichiers :** `messages/fr/*.json` + `messages/en/*.json` minimum.

**Exceptions :** messages d'erreur API (EN ok), logs, identifiants techniques.

---

## Fichiers d'Environnement

```
apps/[app]/api/
├── .env.example       # Template SANS secrets (commite)
├── .env.local         # Dev avec secrets (gitignore)
└── .env.production    # Prod avec secrets (gitignore)
```

**Workflow :**

1. Copier `.env.example` --> `.env.local`
2. Remplir les valeurs
3. Les ports sont auto-detectes par `@ezstart/config` — pas besoin de `PORT=`

**Regle : `.env.example` toujours a jour avec toutes les variables.**

---

## Protection des Donnees (MongoDB)

Suite a un incident de suppression de donnees en production, ces regles sont **non-negociables** :

```
DEV:  mongodb://localhost:27017/[db]-dev
TEST: MongoMemoryServer (en memoire, jamais prod)
PROD: mongodb+srv://...@cluster.mongodb.net/[db]
```

**Avant de lancer des tests :**

- [ ] `.env.test` existe et pointe vers localhost
- [ ] `vitest.config.ts` charge `.env.test`
- [ ] `NODE_ENV=test` est force
- [ ] Jamais de `deleteMany({})` sans guard `NODE_ENV !== 'test'`

---

## Git & Branches

### Branches

| Prefixe     | Usage                                   |
| ----------- | --------------------------------------- |
| `feat/`     | Nouvelle feature ou app                 |
| `fix/`      | Correction de bug                       |
| `refactor/` | Refactoring sans changement fonctionnel |
| `chore/`    | Maintenance, docs, config               |

### Commits conventionnels

```
type(scope): description courte

feat(ezpay): add payment history endpoint
fix(auth-sdk): fix token refresh race condition
refactor(ui): extract DataTable pagination into hook
docs(ezbill): update API reference in README
```

**Types :** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

### Flow obligatoire

```
1. git checkout -b feat/ma-feature
2. ... coder ...
3. pnpm typecheck                    # OBLIGATOIRE avant commit
4. git add fichiers-modifies
5. git commit -m "feat(scope): description"
6. git push origin feat/ma-feature
7. gh pr create --title "feat(scope): description"
8. Review par admin --> merge
9. Supprimer la branche apres merge
```

**Interdit dans les messages de commit :**

- "Generated with Claude Code"
- "Co-Authored-By: Claude"

---

## Ports & Commandes

### Ports des services

| Service        | API  | Web  |
| -------------- | ---- | ---- |
| EZStart        | 6100 | 6101 |
| EZAuth         | 6110 | 6111 |
| EZBill         | 6120 | 6121 |
| EZPay          | 6130 | 6131 |
| ASC-TCD        | --   | 6141 |
| FengShui       | --   | 6151 |
| GreenPulse     | 6160 | 6161 |
| Gacha Analyzer | 6170 | 6171 |

### Commandes de developpement

```bash
pnpm install              # Installer les dependances

pnpm dev ez               # EZStart + EZAuth + EZPay
pnpm dev bill             # EZBill + EZAuth
pnpm dev gp               # GreenPulse + EZAuth
pnpm dev pay              # EZPay
pnpm dev fs               # FengShui + EZAuth + EZPay
pnpm dev asc              # ASC-TCD
pnpm dev ga               # Gacha Analyzer + EZAuth
pnpm dev --list           # Voir toutes les apps disponibles

pnpm typecheck            # tsc --noEmit (verification types)
pnpm test                 # vitest (VERIFIER .env.test avant !)
```

### Deploiement

| Type     | Plateforme |
| -------- | ---------- |
| APIs     | Railway    |
| Web apps | Vercel     |

Detail complet dans [DEPLOY.md](./DEPLOY.md).

---

## Couleurs semantiques — Reference rapide

| Contexte    | Classes Tailwind                                        |
| ----------- | ------------------------------------------------------- |
| Background  | `bg-background`, `bg-card`, `bg-muted`, `bg-accent`     |
| Texte       | `text-foreground`, `text-muted-foreground`              |
| Primary     | `bg-primary`, `text-primary`, `text-primary-foreground` |
| Destructive | `bg-destructive`, `text-destructive`                    |
| Bordures    | `border`, `border-input`, `border-ring`                 |
| Status      | `bg-success`, `bg-warning`, `bg-error`, `bg-info`       |

Le dark mode fonctionne automatiquement avec ces classes (variables OKLCH).

---

## TypeScript

- **Target :** ES2022 pour tout le monorepo
- **Compilation :** `tsc -b` centralise a la racine (un seul processus)
- **Config :** Toujours etendre `@ezstart/typescript-config/[variante].json`
  - `base.json` — packages simples
  - `api.json` — Express
  - `nextjs.json` — Next.js
  - `library.json` — bibliotheque generique
  - `react-library.json` — React library
- **`composite: true`** dans tous les tsconfig
- **Naming :** PascalCase (composants), camelCase (fonctions/variables), UPPERCASE (constantes), kebab-case (dossiers)
