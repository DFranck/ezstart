# 🤖 AI Agent Improvement Cycle - @ezstart Monorepo

**Objectif:** Créer un cycle vertueux où chaque intervention d'agent IA améliore le projet sans répéter les mêmes problèmes.

**Version:** 1.0.0
**Date:** 2025-11-03

---

## 🎯 Philosophie du Cycle Vertueux

### Principe Fondamental

> **Chaque problème résolu devient une règle, chaque règle prévient les régressions.**

**Concept:** Au lieu de résoudre les mêmes problèmes à répétition, l'agent IA doit:
1. ✅ **Identifier** le problème root cause
2. ✅ **Résoudre** le problème actuel
3. ✅ **Documenter** la solution dans les règles
4. ✅ **Prévenir** les régressions futures via architecture/lint/tests
5. ✅ **Mesurer** l'impact via audits

---

## 🔄 Le Cycle en 5 Phases

```
┌─────────────────────────────────────────────────────────────┐
│                    CYCLE D'AMÉLIORATION                      │
└─────────────────────────────────────────────────────────────┘

Phase 1: ANALYSE           → Comprendre l'état actuel
    ↓
Phase 2: PLANIFICATION     → Définir les actions
    ↓
Phase 3: EXÉCUTION         → Implémenter les solutions
    ↓
Phase 4: DOCUMENTATION     → Capturer les connaissances
    ↓
Phase 5: VALIDATION        → Mesurer l'amélioration
    ↓
└──→ RETOUR Phase 1 (nouveau cycle à un niveau supérieur)
```

---

## 📋 Phase 1: ANALYSE

### Objectif
Comprendre l'état actuel du projet et identifier les priorités.

### Actions de l'Agent IA

#### 1.1 Lire la Documentation Existante
```bash
# ORDRE DE LECTURE OBLIGATOIRE:
1. CLAUDE.md              # Vue d'ensemble, quick start
2. DEV-RULES.md           # Règles obligatoires
3. docs/README.md         # Dashboard des audits
4. docs/ROADMAP.md        # Priorités actuelles
```

**Pourquoi cet ordre?**
- CLAUDE.md = contexte général (5 min)
- DEV-RULES.md = contraintes à respecter (10 min)
- docs/README.md = état de santé du projet (5 min)
- docs/ROADMAP.md = où on va (5 min)

#### 1.2 Identifier la Tâche Demandée

**Questions à se poser:**
- ✅ Quelle est la demande utilisateur exacte?
- ✅ Est-ce une nouvelle feature, un bug fix, une amélioration?
- ✅ Y a-t-il des règles existantes qui s'appliquent?
- ✅ Quel est le score d'audit concerné?

#### 1.3 Vérifier les Précédents

**Avant de créer quelque chose, TOUJOURS chercher:**

```typescript
// Exemple: Besoin d'un nouveau composant UI
1. Vérifier @ezstart/ui - Existe déjà?
2. Vérifier docs/audits/UX-AUDIT.md - Contraintes?
3. Vérifier DEV-RULES.md - Règles UI/UX?
4. Vérifier packages similaires - Pattern réutilisable?
```

**Hiérarchie de recherche:**
1. `packages/` - Code réutilisable monorepo
2. `apps/[project]/shared` - Code partagé web+api
3. `apps/[project]/web|api` - Code spécifique couche
4. Création nouvelle → EN DERNIER RECOURS

### Livrables Phase 1

- ✅ Compréhension claire de la demande
- ✅ Liste des règles applicables
- ✅ Identification du code existant réutilisable
- ✅ Audit(s) concerné(s) identifié(s)

---

## 📝 Phase 2: PLANIFICATION

### Objectif
Définir la solution optimale qui suit les standards existants.

### Actions de l'Agent IA

#### 2.1 Créer un Plan d'Action

**Template de Plan:**
```markdown
## Plan d'Action: [Nom de la Tâche]

### Contexte
- Demande: [Description courte]
- Audit concerné: [Ex: UX-AUDIT.md, score actuel 80/100]
- Règles applicables: [Ex: DEV-RULES.md sections 🎨, 🏗️]

### Solution Proposée
1. [Action 1] - [Justification]
2. [Action 2] - [Justification]
3. [Action 3] - [Justification]

### Fichiers Impactés
- ✏️ Modifier: apps/ezstart/web/src/components/Header.tsx
- ➕ Créer: packages/ui/src/components/Skeleton.tsx
- 📚 Documenter: packages/ui/README.md

### Tests à Créer
- Unit tests: [Liste]
- Integration tests: [Liste]
- E2E tests: [Liste si nécessaire]

### Documentation à Mettre à Jour
- [x] Package README (si package modifié)
- [x] CLAUDE.md (si nouvelle règle générale)
- [x] DEV-RULES.md (si nouvelle contrainte)
- [x] Audit concerné (si impact sur score)

### Impact Estimé
- Score audit: +5 points (80 → 85)
- Temps: 2h
- Risque: Faible (suivit des patterns existants)
```

#### 2.2 Valider avec l'Utilisateur (si ambiguïté)

**Utiliser AskUserQuestion si:**
- Plusieurs approches possibles
- Choix technologique à faire
- Impact sur l'architecture
- Modification de comportement existant

### Livrables Phase 2

- ✅ Plan d'action détaillé et justifié
- ✅ Liste des fichiers à modifier/créer
- ✅ Stratégie de tests
- ✅ Stratégie de documentation

---

## 🛠️ Phase 3: EXÉCUTION

### Objectif
Implémenter la solution en respectant les standards.

### Actions de l'Agent IA

#### 3.1 Suivre les Standards du Monorepo

**Checklist Obligatoire:**

##### Pour le Code UI
```tsx
// ❌ JAMAIS
<div className="bg-gray-100 p-4">
  <h2 className="text-lg">Title</h2>
  <button className="bg-blue-500">Click</button>
</div>

// ✅ TOUJOURS
import { Card, CardHeader, H2, Button } from '@ezstart/ui/components'

<Card variant="floating">
  <CardHeader>
    <H2 size="h3">Title</H2>
  </CardHeader>
  <CardContent>
    <Button variant="primary">Click</Button>
  </CardContent>
</Card>
```

##### Pour la Configuration
```typescript
// ❌ JAMAIS hardcoder
const API_URL = 'http://localhost:5040'
const PROD_URL = 'https://ezpay-api.up.railway.app'

// ✅ TOUJOURS utiliser @ezstart/config
import { getApiUrl } from '@ezstart/config'
const API_URL = getApiUrl('ezpay')
```

##### Pour MongoDB
```typescript
// ❌ JAMAIS
import mongoose from 'mongoose'
mongoose.connect(process.env.MONGO_URL)

// ✅ TOUJOURS
import { connectToMongo } from '@ezstart/express-core'
const mongoose = await connectToMongo('database-name')
```

#### 3.2 Créer les Tests Immédiatement

**Ne PAS reporter les tests à plus tard!**

```typescript
// Créer le test EN MÊME TEMPS que le code
// src/components/Skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted', className)} />
}

// src/components/Skeleton.test.tsx (CRÉÉ IMMÉDIATEMENT)
describe('Skeleton', () => {
  it('renders with default classes', () => {
    render(<Skeleton />)
    expect(screen.getByRole('status')).toHaveClass('animate-pulse', 'bg-muted')
  })

  it('accepts custom className', () => {
    render(<Skeleton className="h-4 w-20" />)
    expect(screen.getByRole('status')).toHaveClass('h-4', 'w-20')
  })
})
```

#### 3.3 Vérifier la Qualité en Continu

```bash
# Après chaque modification significative
pnpm typecheck              # Pas d'erreurs TypeScript
pnpm lint                   # Pas de violations ESLint critiques
pnpm --filter [package] test  # Tests passent

# Avant de commit
pnpm build                  # Build réussit
pnpm test                   # Tous les tests passent
```

### Livrables Phase 3

- ✅ Code implémenté suivant les standards
- ✅ Tests créés et passant
- ✅ TypeCheck sans erreur
- ✅ Lint conforme
- ✅ Build réussi

---

## 📚 Phase 4: DOCUMENTATION

### Objectif
Capturer les connaissances pour éviter de répéter les mêmes erreurs.

### Actions de l'Agent IA

#### 4.1 Documenter au Bon Endroit

**Règle de décision:**

```
┌─────────────────────────────────────────────────────────┐
│ QUEL FICHIER METTRE À JOUR?                             │
└─────────────────────────────────────────────────────────┘

Si modification d'un package:
└─→ packages/[package]/README.md (OBLIGATOIRE)
    - Ajouter exemples d'usage
    - Documenter l'API
    - Lister les apps utilisatrices

Si nouvelle règle générale:
└─→ DEV-RULES.md
    - Section concernée (UI/UX, API, MongoDB, etc.)
    - Exemple ❌ JAMAIS / ✅ TOUJOURS
    - Justification du pourquoi

Si pattern spécifique au projet:
└─→ apps/[project]/README.md ou docs/
    - Architecture spécifique
    - Contraintes métier
    - Exemples d'usage

Si impact sur un audit:
└─→ docs/audits/[AUDIT].md
    - Mettre à jour les résultats
    - Recalculer le score
    - Documenter les changements

Si nouvelle pratique de développement:
└─→ CLAUDE.md
    - Quick start
    - Bonnes pratiques
    - Troubleshooting
```

#### 4.2 Structure de Documentation

**Pour les Packages (packages/[name]/README.md):**
```markdown
# @ezstart/[package-name]

## Overview
[Description courte en 1-2 phrases]

## Installation
[Comment l'installer]

## Configuration
[Setup nécessaire]

## Usage
[Exemples de code avec explications]

## API Reference
[Fonctions, types, composants disponibles]

## Used By
[Liste des apps qui utilisent ce package]

## Related Packages
[Packages dépendants ou similaires]
```

**Pour les Règles (DEV-RULES.md):**
```markdown
### [Titre de la Règle]

**Contexte:** [Pourquoi cette règle existe]

**❌ JAMAIS faire:**
```typescript
// Exemple de code à éviter
const bad = "example"
```

**✅ TOUJOURS faire:**
```typescript
// Exemple de code correct
const good = "example"
```

**Raison:** [Justification technique]

**Exceptions:** [S'il y en a]
```

#### 4.3 Mettre à Jour les Audits

**Template de mise à jour d'audit:**
```markdown
## [Section Concernée]

### Before (Score: X/100)
- ❌ Problème 1
- ❌ Problème 2

### After (Score: Y/100, +Z points)
- ✅ Solution 1 (implemented [date])
- ✅ Solution 2 (implemented [date])

### Evidence
- Fichiers modifiés: [liste]
- Tests ajoutés: [nombre]
- Documentation: [liens]
```

#### 4.4 Commits Structurés

**Format Standard:**
```bash
git commit -m "type(scope): brief description

- Detailed change 1
- Detailed change 2
- Impact on audit: [AUDIT-NAME] +X points (Y → Z)
- Tests: [number] added/updated
- Documentation: [files] updated
"
```

**Types:** feat, fix, docs, refactor, perf, test, chore, ci, build

### Livrables Phase 4

- ✅ README(s) mis à jour (si packages modifiés)
- ✅ DEV-RULES.md mis à jour (si nouvelle règle)
- ✅ CLAUDE.md mis à jour (si impact quick start)
- ✅ Audit(s) mis à jour (si impact score)
- ✅ Commit structuré et descriptif

---

## ✅ Phase 5: VALIDATION

### Objectif
Mesurer l'amélioration et s'assurer qu'elle est durable.

### Actions de l'Agent IA

#### 5.1 Exécuter les Vérifications

```bash
# 1. Qualité du code
pnpm typecheck    # Doit passer ✅
pnpm lint         # Doit passer ✅
pnpm build        # Doit passer ✅

# 2. Tests
pnpm test         # Tous les tests passent ✅
pnpm test:coverage # Coverage maintenu ou amélioré ✅

# 3. Performance (si applicable)
pnpm build:analyze # Bundle sizes OK ✅
```

#### 5.2 Vérifier les Audits Impactés

**Exemple: Amélioration UX**

```bash
# Avant
UX Score: 70/100
- ❌ Pas de loading states
- ❌ Erreurs pas user-friendly
- ❌ Mobile UX perfectible

# Après
UX Score: 80/100 (+10 points)
- ✅ Skeleton components créés
- ✅ Error boundaries ajoutés
- ✅ Touch targets 44x44px minimum

# Preuves
- Tests: +15 tests ajoutés
- Documentation: 3 READMEs mis à jour
- Code: 8 fichiers modifiés, 2 créés
```

#### 5.3 Créer un Rapport d'Amélioration

**Template:**
```markdown
# Rapport d'Amélioration - [Tâche]

**Date:** [Date]
**Agent:** Claude [Version]
**Durée:** [Temps passé]

## Objectif Initial
[Demande utilisateur]

## Solution Implémentée
[Description de la solution]

## Résultats Mesurables
- Score audit: [AVANT] → [APRÈS] (+X points)
- Tests: +X tests (Y → Z total)
- Coverage: [AVANT]% → [APRÈS]%
- Build time: [AVANT]s → [APRÈS]s

## Fichiers Impactés
### Modifiés
- [Liste]

### Créés
- [Liste]

### Documentation
- [Liste]

## Règles Ajoutées/Modifiées
- DEV-RULES.md: [Sections]
- CLAUDE.md: [Sections]

## Tests de Régression Ajoutés
[Liste des tests qui préviennent ce problème à l'avenir]

## Prochaines Étapes Recommandées
1. [Action 1]
2. [Action 2]
3. [Action 3]
```

### Livrables Phase 5

- ✅ Tous les checks passent
- ✅ Score d'audit amélioré (mesurable)
- ✅ Rapport d'amélioration créé
- ✅ Tests de régression en place

---

## 🔄 Amélioration Continue

### Principe du Cycle Vertueux

**Chaque cycle doit:**
1. ✅ Résoudre un problème spécifique
2. ✅ Élever le niveau de qualité général
3. ✅ Prévenir les régressions
4. ✅ Documenter pour l'avenir

**Le cycle suivant devrait:**
- ❌ NE PAS résoudre le même type de problème (régression!)
- ✅ S'attaquer à un problème d'un niveau supérieur
- ✅ Construire sur les améliorations précédentes

### Exemple de Progression Vertueuse

```
Cycle 1: Fix Bug
└─→ Problème: Erreur dans le formulaire
    Solution: Corriger la validation
    Documentation: Exemple de validation ajouté
    Prévention: Test unitaire ajouté

Cycle 2: Généraliser (niveau supérieur)
└─→ Problème: Tous les formulaires ont des validations différentes
    Solution: Créer FormField dans @ezstart/ui
    Documentation: Guide de validation dans DEV-RULES.md
    Prévention: Lint rule pour forcer l'usage de FormField

Cycle 3: Optimiser (niveau supérieur)
└─→ Problème: FormField pourrait être plus performant
    Solution: React.memo + useCallback
    Documentation: Performance patterns dans CLAUDE.md
    Prévention: Tests de performance ajoutés

Cycle 4: Mesurer (niveau supérieur)
└─→ Problème: Pas de visibilité sur l'usage de FormField
    Solution: Monitoring + analytics
    Documentation: Monitoring patterns dans docs/
    Prévention: Alerting si usage incorrect détecté
```

**Résultat:** Chaque cycle élève le niveau, on ne revient jamais en arrière.

---

## 📊 Métriques de Succès du Cycle

### KPIs par Cycle

| Métrique | Cible | Mesure |
|----------|-------|--------|
| **Score Audit Global** | +1 à +5 par cycle | docs/README.md |
| **Tests Ajoutés** | ≥ 1 par feature | Coverage report |
| **Documentation** | 100% à jour | Checklist complétée |
| **Règles Ajoutées** | ≥ 1 si pattern nouveau | DEV-RULES.md |
| **Temps par Cycle** | 1h à 4h | Tracking manuel |
| **Régressions** | 0 | Tests passent |

### Indicateurs de Qualité du Cycle

**🟢 Cycle Vertueux (bon):**
- ✅ Problème résolu complètement
- ✅ Documentation à jour
- ✅ Tests ajoutés
- ✅ Règles créées pour prévenir
- ✅ Score audit amélioré
- ✅ Pas de régression

**🟡 Cycle Partiel (acceptable):**
- ✅ Problème résolu
- ✅ Documentation basique
- ⚠️ Tests minimaux
- ⚠️ Règles partielles
- ⚠️ Pas d'impact audit

**🔴 Cycle Vicieux (à éviter):**
- ⚠️ Quick fix sans comprendre root cause
- ❌ Pas de documentation
- ❌ Pas de tests
- ❌ Pas de règles
- ❌ Régression possible
- ❌ Même problème pourrait réapparaître

---

## 🎓 Apprentissage et Adaptation

### Comment l'Agent IA Doit S'Adapter

#### Niveau 1: Suivre les Règles
```
Agent lit DEV-RULES.md → Applique les patterns → Code conforme
```

#### Niveau 2: Comprendre les Patterns
```
Agent analyse le code existant → Identifie les patterns → Reproduit intelligemment
```

#### Niveau 3: Identifier les Gaps
```
Agent détecte incohérences → Propose des règles → Améliore l'architecture
```

#### Niveau 4: Optimiser Proactivement
```
Agent anticipe les problèmes → Suggère des améliorations → Élève les standards
```

### Feedback Loop

**Après chaque cycle:**
1. ✅ Vérifier si la solution suit les patterns existants
2. ✅ Si oui → Bon, continuer
3. ⚠️ Si non mais justifié → Documenter le nouveau pattern
4. ❌ Si non et injustifié → Réviser la solution

---

## 🛠️ Outils et Commandes

### Pour l'Analyse (Phase 1)
```bash
# Lire la doc essentielle
cat CLAUDE.md DEV-RULES.md docs/README.md docs/ROADMAP.md

# Vérifier l'état du projet
pnpm typecheck              # TypeScript errors?
pnpm lint                   # ESLint issues?
pnpm test                   # Tests status?

# Chercher du code existant
rg "pattern" packages/      # Recherche dans packages
rg "component" apps/*/web/  # Recherche dans web apps
```

### Pour la Validation (Phase 5)
```bash
# Qualité
pnpm typecheck && pnpm lint && pnpm build

# Tests
pnpm test
pnpm test:coverage

# Audits
# (Voir docs/README.md pour scores actuels)
```

---

## 📚 Checklist Complète du Cycle

### ✅ Phase 1: ANALYSE
- [ ] CLAUDE.md lu et compris
- [ ] DEV-RULES.md lu et compris
- [ ] docs/README.md consulté (scores actuels)
- [ ] docs/ROADMAP.md consulté (priorités)
- [ ] Demande utilisateur claire
- [ ] Code existant recherché

### ✅ Phase 2: PLANIFICATION
- [ ] Plan d'action créé
- [ ] Fichiers impactés listés
- [ ] Stratégie de tests définie
- [ ] Documentation à mettre à jour listée
- [ ] Impact sur audits estimé
- [ ] Validation utilisateur si ambiguïté

### ✅ Phase 3: EXÉCUTION
- [ ] Code suit les standards (DEV-RULES.md)
- [ ] Tests créés en parallèle
- [ ] TypeCheck passe
- [ ] Lint passe
- [ ] Build réussit
- [ ] Pas de régression

### ✅ Phase 4: DOCUMENTATION
- [ ] README(s) package mis à jour
- [ ] DEV-RULES.md mis à jour (si règle nouvelle)
- [ ] CLAUDE.md mis à jour (si impact général)
- [ ] Audit(s) mis à jour (si impact score)
- [ ] Commit structuré et descriptif

### ✅ Phase 5: VALIDATION
- [ ] Tous les checks passent (typecheck/lint/build/test)
- [ ] Score audit amélioré (mesurable)
- [ ] Tests de régression en place
- [ ] Rapport d'amélioration créé (si majeur)
- [ ] Prochaines étapes identifiées

---

## 🎯 Exemples Concrets

### Exemple 1: Bug Fix → Règle → Prévention

**Contexte:** Bug dans la validation d'email

```
Phase 1: ANALYSE
└─→ Email validation incohérente entre apps
    Root cause: Regex dupliquée à 5 endroits différents

Phase 2: PLAN
└─→ 1. Créer validateEmail() dans @ezstart/utils
    2. Remplacer tous les usages
    3. Ajouter tests unitaires
    4. Ajouter règle dans DEV-RULES.md

Phase 3: EXÉCUTION
└─→ packages/utils/src/validation.ts
    export function validateEmail(email: string): boolean {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    + Tests: 8 cas de test
    + Remplacement: 5 fichiers modifiés

Phase 4: DOCUMENTATION
└─→ DEV-RULES.md: Nouvelle section "Validation"
    ❌ JAMAIS: Regex inline pour email
    ✅ TOUJOURS: import { validateEmail } from '@ezstart/utils'

    packages/utils/README.md: Section Validation ajoutée

Phase 5: VALIDATION
└─→ Tests: +8 (email validation)
    TypeCheck: ✅ Pass
    Lint: ✅ Pass
    Score: Code Quality +2 points (90 → 92)
```

**Résultat:** Le problème ne peut plus réapparaître (code centralisé + tests + règle).

### Exemple 2: Feature → Pattern → Architecture

**Contexte:** Ajout de loading states

```
Phase 1: ANALYSE
└─→ Demande: Ajouter loading skeletons
    Audit: UX 70/100 - "Pas de loading states uniformes"
    Existant: Aucun skeleton component

Phase 2: PLAN
└─→ 1. Créer Skeleton component dans @ezstart/ui
    2. Créer variants (text, card, avatar, etc.)
    3. Ajouter dans toutes les pages avec fetching
    4. Pattern Suspense + ErrorBoundary
    5. Tests + Storybook + Documentation

Phase 3: EXÉCUTION
└─→ packages/ui/src/components/skeleton/
    ├── Skeleton.tsx (composant base)
    ├── SkeletonText.tsx
    ├── SkeletonCard.tsx
    ├── SkeletonAvatar.tsx
    └── index.ts

    + Tests: 12 tests
    + Usage: 8 pages modifiées
    + Pattern: <Suspense fallback={<Skeleton />}>

Phase 4: DOCUMENTATION
└─→ packages/ui/README.md: Section Loading States
    DEV-RULES.md: Section UI/UX Loading States
    docs/audits/UX-AUDIT.md: +10 points (70 → 80)
    CLAUDE.md: Pattern Suspense ajouté

Phase 5: VALIDATION
└─→ Tests: +12 tests skeleton
    UX Score: 70 → 80 (+10 points)
    Performance: Pas d'impact négatif
    Accessibility: ARIA role="status" ajouté
```

**Résultat:** Pattern réutilisable créé, standard établi, audit amélioré.

---

## 🚀 Conclusion

### Résumé du Cycle Vertueux

Le cycle vertueux garantit que:
1. ✅ Chaque problème est résolu **complètement**
2. ✅ La solution est **documentée** pour l'avenir
3. ✅ Les **tests** préviennent les régressions
4. ✅ Les **règles** guident les futurs développements
5. ✅ Les **audits** mesurent l'amélioration continue

### Mindset de l'Agent IA

**Penser LONG TERME:**
- ❌ Quick fix qui résout le symptôme
- ✅ Solution qui résout la root cause + prévient l'avenir

**Penser RÉUTILISABILITÉ:**
- ❌ Code copié-collé entre projets
- ✅ Package centralisé avec tests et doc

**Penser MESURE:**
- ❌ "Ça marche" sans validation
- ✅ Tests + audits + métriques

### Prochaines Étapes

Pour mettre en place ce cycle:
1. ✅ Lire ce document avant chaque intervention
2. ✅ Suivre les 5 phases systématiquement
3. ✅ Compléter toutes les checklists
4. ✅ Mesurer l'impact sur les audits
5. ✅ Améliorer ce document si gaps identifiés

---

**Ce cycle est lui-même vertueux: Il s'améliore à chaque itération!** 🚀

