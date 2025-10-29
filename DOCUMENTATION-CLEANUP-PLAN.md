# 📋 PLAN DE NETTOYAGE DOCUMENTATION

**Objectif :** Passer de **159 fichiers** → **~40 fichiers essentiels** (75% réduction)

---

## 📊 ÉTAT ACTUEL

```
159 fichiers markdown total
├── Root: 13 fichiers (CLAUDE.md = 6500 lignes ⚠️)
├── docs/: 40 fichiers (audits + guides)
├── apps/: 46 fichiers (20 pour Tower Defense seul!)
└── packages/: 60 fichiers (20 AUDIT.md redondants)
```

**Problèmes identifiés :**
1. 🔥 CLAUDE.md trop gros (6500 lignes)
2. ⚠️ Doublons audits (docs/audits/ + packages/*/AUDIT.md)
3. ⚠️ Tower Defense = 20 fichiers (5 suffisent)
4. ❌ 10+ structure.md générés automatiquement (inutiles)
5. ❌ Fichiers temporaires (PHASE-*.md, reports)

---

## 🎯 STRUCTURE FINALE CIBLE

```
40 fichiers essentiels
├── Root: 4 fichiers
│   ├── CLAUDE.md (500 lignes max, liens vers docs/)
│   ├── DEV-RULES.md
│   ├── README.md
│   └── DEPLOY.md
│
├── docs/: 22 fichiers
│   ├── audits/ (16 fichiers) ✅ GARDER
│   ├── archive/ (fichiers obsolètes)
│   ├── CLAUDE-ARCHIVE.md (historique complet)
│   ├── TESTING.md (consolide 4 fichiers)
│   ├── ROADMAP.md (consolide 3 fichiers)
│   ├── CI-CD-SETUP.md
│   ├── AUDIT-GUIDE.md
│   ├── AUDIT-SUMMARY.md
│   └── README.md
│
├── apps/: 8 fichiers
│   └── [app]/README.md uniquement
│   (sauf Tower Defense, GreenPulse avec docs critiques)
│
└── packages/: 20 fichiers
    └── [package]/README.md uniquement
```

---

## 📝 PHASE 1: ROOT (13 → 4 fichiers)

### ✅ Actions

#### 1. Refactorer CLAUDE.md (6500 → 500 lignes)

**Nouveau CLAUDE.md (500 lignes) :**
```markdown
# 🚀 Configuration Claude - @ezstart Monorepo

## 📚 Documentation Essentielle

**Lire en premier :**
- 📐 [DEV-RULES.md](./DEV-RULES.md) - Règles de développement
- 📊 [docs/README.md](./docs/README.md) - Dashboard des audits
- 🚀 [DEPLOY.md](./DEPLOY.md) - Guide de déploiement
- 🧪 [docs/TESTING.md](./docs/TESTING.md) - Stratégie de tests
- 🤖 [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md) - Infrastructure as Code

**Historique complet :** [docs/CLAUDE-ARCHIVE.md](./docs/CLAUDE-ARCHIVE.md)

## 🎯 Quick Start

[500 lignes max avec liens vers docs détaillées]
```

**Créer docs/CLAUDE-ARCHIVE.md (6000 lignes) :**
- Tout l'historique détaillé
- Migrations complètes
- Audits passés

#### 2. Supprimer Fichiers Temporaires (8 fichiers)

```bash
# Rapports temporaires (info consolidée ailleurs)
rm AUDIT-FINAL-26-10-2025.md
rm AUDIT-STATUS-26-10-2025.md
rm DOCS-STATUS-26-10-2025.md
rm database-consistency-report.md
rm test-verification-report.md

# Phases terminées
rm PHASE-1-COMPLETE.md
rm PHASE-2-COMPLETE.md
rm HTTPONLY-PRODUCTION-SETUP.md
rm MIGRATION-HTTPONLY-PLAN.md
```

#### 3. Archiver Documents Obsolètes

```bash
mkdir -p docs/archive/
mv BUILD-COMMANDS.md docs/archive/
mv MONITORING.md docs/archive/
mv START-AUTONOMOUS.md docs/archive/
```

**Résultat Phase 1 :** 4 fichiers essentiels dans root

---

## 📝 PHASE 2: DOCS/ (40 → 22 fichiers)

### ✅ Actions

#### 1. Consolider Testing (4 → 1 fichier)

**Créer docs/TESTING.md (300 lignes) :**
- Strategy
- Setup Guide
- Running Tests
- CI/CD Integration

**Supprimer :**
```bash
rm docs/TESTING-STRATEGY-V2.md
rm docs/TESTING-BLOCKERS.md
rm docs/TESTING-MISSION.md
```

#### 2. Consolider Roadmap (2 → 1 fichier)

**Créer docs/ROADMAP.md (200 lignes) :**
- Current Score (95/100)
- Phase 3 Plan
- Excellence Targets (100/100)

**Supprimer :**
```bash
rm docs/IMPROVEMENT-ROADMAP-V2.md
rm docs/IMPROVEMENT-ROADMAP.md
```

#### 3. Archiver Temporaires

```bash
mv docs/MIGRATION-CONFIG.md docs/archive/
mv docs/NEXT-SESSION.md docs/archive/
mv docs/SESSION-SUMMARY-*.md docs/archive/
mv docs/PHASE-*.md docs/archive/
```

#### 4. Garder Essentiels ✅

- ✅ docs/audits/ (16 fichiers)
- ✅ docs/CI-CD-SETUP.md
- ✅ docs/AUDIT-GUIDE.md
- ✅ docs/AUDIT-SUMMARY.md
- ✅ docs/README.md

**Résultat Phase 2 :** 22 fichiers essentiels dans docs/

---

## 📝 PHASE 3: APPS/ (46 → 8 fichiers)

### ✅ Tower Defense (20 → 5 fichiers)

**Garder :**
```
apps/tower-defense/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md (consolide flows + redesign)
│   └── GAMEPLAY.md (consolide GDD + TDD)
└── api/
    └── LOAD-TESTING.md
```

**Supprimer :**
```bash
# Flows (info dans ARCHITECTURE.md)
rm -rf apps/tower-defense/docs/flows/

# Fichiers implémentation (terminés)
rm apps/tower-defense/ARCHITECTURE-REDESIGN.md
rm apps/tower-defense/FRONTEND-AUDIT.md
rm apps/tower-defense/GAMEPLAY-VALIDATION.md
rm apps/tower-defense/IMPLEMENTATION-*.md
rm apps/tower-defense/MIGRATION-STATUS.md
rm apps/tower-defense/OPTIMIZATION-*.md
rm apps/tower-defense/PERFORMANCE-SUMMARY.md
rm apps/tower-defense/README-OPTIMIZATION.md

# structure.md générés
rm apps/tower-defense/*/structure.md
```

### ✅ GreenPulse (8 → 3 fichiers)

**Créer apps/green-pulse/FORMS.md (300 lignes) :**
- Design + Implementation + Quick Start + Status
- Consolidation de 4 fichiers

**Garder :**
```
apps/green-pulse/
├── README.md
├── FORMS.md
└── api/GEMINI-SETUP.md
```

**Supprimer :**
```bash
rm apps/green-pulse/FORMS-DESIGN.md
rm apps/green-pulse/FORMS-IMPLEMENTATION.md
rm apps/green-pulse/FORMS-QUICK-START.md
rm apps/green-pulse/FORMS-STATUS.md
rm apps/green-pulse/ROADMAP.md
```

### ✅ EZBill (5 → 2 fichiers)

**Créer apps/ezbill/ROADMAP.md (150 lignes) :**
- Core Features + Global UX + Post-Core
- Consolidation de 3 fichiers

**Garder :**
```
apps/ezbill/
├── README.md
└── ROADMAP.md
```

**Supprimer :**
```bash
rm apps/ezbill/docs/core-features.md
rm apps/ezbill/docs/global-ux.md
rm apps/ezbill/docs/post-core-roadmap.md
```

### ✅ Autres Apps

**Supprimer structure.md partout :**
```bash
find apps/ -name "structure.md" -delete
```

**Résultat Phase 3 :** 8 fichiers essentiels dans apps/

---

## 📝 PHASE 4: PACKAGES/ (60 → 20 fichiers)

### ✅ Actions

#### 1. Supprimer structure.md (10 fichiers)

```bash
find packages/ -name "structure.md" -delete
```

#### 2. Supprimer AUDIT.md (20 fichiers)

**Tous les audits packages sont déjà dans docs/audits/ !**

```bash
find packages/ -name "AUDIT.md" -delete
```

#### 3. Auth-SDK: Consolider (5 → 2 fichiers)

**Créer packages/auth-sdk/HTTPONLY-MIGRATION.md (200 lignes) :**
- Guide complet migration
- Fixes appliqués
- Production setup

**Supprimer :**
```bash
rm packages/auth-sdk/HTTPONLY-COOKIES-GUIDE.md
rm packages/auth-sdk/STATE-PARAMETER-FIX.md
rm packages/auth-sdk/TOKEN-EXPIRATION-FIX.md
```

**Résultat Phase 4 :** 20 fichiers (README uniquement) dans packages/

---

## ✅ RÉSULTAT FINAL

### Avant → Après

| Zone | Avant | Après | Réduction |
|------|-------|-------|-----------|
| **Root** | 13 | 4 | -69% |
| **docs/** | 40 | 22 | -45% |
| **apps/** | 46 | 8 | -83% |
| **packages/** | 60 | 20 | -67% |
| **TOTAL** | **159** | **54** | **-66%** |

### Avantages

✅ **Navigabilité** : 66% moins de fichiers
✅ **Maintenance** : Documentation consolidée par sujet
✅ **Onboarding** : CLAUDE.md court (500 lignes) avec liens clairs
✅ **Historique Préservé** : docs/archive/ + docs/CLAUDE-ARCHIVE.md
✅ **Structure Claire** : 1 fichier par sujet maximum

---

## ⚠️ RÈGLES CRITIQUES

### Ne PAS Supprimer

- ❌ docs/audits/ (16 fichiers) - Structure validée
- ❌ README.md des packages - Documentation API
- ❌ DEV-RULES.md - Règles de dev critiques
- ❌ DEPLOY.md - Guide déploiement

### Process de Nettoyage

1. ✅ Toujours créer `docs/archive/` avant de supprimer
2. ✅ Consolider avant de supprimer
3. ✅ Vérifier références dans CLAUDE.md
4. ✅ Commit après chaque phase

---

## 🚀 ORDRE D'EXÉCUTION

```bash
# 1. Créer archive
mkdir -p docs/archive

# 2. Phase 1: Root
[actions Phase 1]
git add . && git commit -m "docs: cleanup root (13 → 4 files)"

# 3. Phase 2: docs/
[actions Phase 2]
git add . && git commit -m "docs: consolidate docs/ (40 → 22 files)"

# 4. Phase 3: apps/
[actions Phase 3]
git add . && git commit -m "docs: cleanup apps/ (46 → 8 files)"

# 5. Phase 4: packages/
[actions Phase 4]
git add . && git commit -m "docs: cleanup packages/ (60 → 20 files)"

# 6. Final: Update CLAUDE.md
[refactor CLAUDE.md]
git add . && git commit -m "docs: refactor CLAUDE.md (6500 → 500 lines)"
```

---

## ✅ VALIDATION

Après cleanup, vérifier :

```bash
# Compter fichiers .md
find . -name "*.md" -type f | grep -v node_modules | wc -l
# Doit être ~54

# Vérifier taille CLAUDE.md
wc -l CLAUDE.md
# Doit être ~500 lignes

# Vérifier archive existe
ls -la docs/archive/
# Doit contenir fichiers obsolètes
```
