# 🔍 Audit Workflow pour Agents IA

**Comment utiliser les audits comme source de vérité pour améliorer le monorepo**

---

## 🎯 Principe Fondamental

> **Les audits dans `docs/audits/` sont la SEULE source de vérité pour:**
> - Identifier les problèmes
> - Mesurer les progrès
> - Documenter les améliorations
> - Calculer les scores

**PAS de documentation ailleurs!** Tout dans les audits.

---

## 📋 Workflow en 4 Étapes

### Étape 1: ANALYSER les Audits (20 min)

```bash
# Lire tous les audits
ls docs/audits/*.md

# Identifier les scores
grep "Score:" docs/audits/*.md
```

**Tu cherches:**
- ❌ Sections avec status "Not Fixed"
- ⚠️ Sections avec status "In Progress"
- 📉 Scores < 90/100
- 🎯 "High Priority" items

**Exemple de ce que tu trouves:**

```markdown
# docs/audits/API-AUDIT.md
## Score: 78/100 ⬅️ SOUS 90!

### Problem 1: Rate Limiting
**Score Impact:** -22 points ⬅️ GROS IMPACT!
**Status:** ❌ Not Fixed ⬅️ PAS FAIT!
**Priority:** HIGH ⬅️ PRIORITAIRE!
**Effort:** 2h ⬅️ QUICK WIN!
```

---

### Étape 2: CALCULER les Priorités (10 min)

**Formule de priorité:**
```
Priorité = (Score Impact) / (Effort en heures)
```

**Exemple:**

| Problem | Audit | Impact | Effort | Priorité | Recommandation |
|---------|-------|--------|--------|----------|----------------|
| Rate Limiting | API | -22 pts | 2h | **11.0** | ⭐ DO FIRST |
| ARIA Complete | A11y | -7 pts | 3h | 2.3 | Do second |
| Bundle Size | Perf | -5 pts | 2h | 2.5 | Do second |
| OpenAPI Docs | API | -8 pts | 4h | 2.0 | Do third |
| Mobile Touch | UX | -3 pts | 1h | 3.0 | Quick win |

**Trier par priorité** et proposer top 5.

---

### Étape 3: PROPOSER (Format Standardisé)

```markdown
# Propositions d'Amélioration - @ezstart

**Date:** YYYY-MM-DD
**Score Global Actuel:** 84.8/100

## Top 5 Améliorations

### 🥇 #1: Rate Limiting

**Source:** docs/audits/API-AUDIT.md (ligne 45-67)
**Score Actuel:** 78/100
**Score Cible:** 100/100 (+22 points)
**Effort:** 2h
**Priorité:** 11.0 (HIGHEST)

**Problème (depuis l'audit):**
[Copier la section "Current State" de l'audit]

**Solution (depuis l'audit):**
[Copier la section "Proposed Solution" de l'audit]

**Fichiers (depuis l'audit):**
[Copier la section "Files to Modify" de l'audit]

**Tests (depuis l'audit):**
[Copier la section "Tests Required" de l'audit]

**Valider pour commencer?**

---

### 🥈 #2: [Next problem]
...
```

---

### Étape 4: EXÉCUTER et METTRE À JOUR l'Audit

#### 4.1 Implémenter

```
1. Code la solution
2. Crée les tests
3. Vérifie tout passe
```

#### 4.2 Mettre à Jour l'Audit (CRITIQUE!)

**AVANT (dans `docs/audits/API-AUDIT.md`):**

```markdown
### Problem 1: Rate Limiting

**Score Impact:** -22 points
**Status:** ❌ Not Fixed
**Priority:** HIGH
**Effort:** 2h

#### Current State (2025-10-21)
- ❌ No rate limiting implemented
- ❌ APIs vulnerable to abuse
- ❌ No protection against DDoS

#### Target State
- ✅ All APIs have rate limiting
- ✅ 100 req/15min per IP
- ✅ Proper error responses (429)

#### Proposed Solution
- Implement express-rate-limit
- Configure on all 6 APIs
- Tests for rate limit scenarios
```

**APRÈS (tu mets à jour!):**

```markdown
### Problem 1: Rate Limiting

**Score Impact:** -22 points → 0 (FIXED) ⬅️ UPDATE
**Status:** ✅ Fixed (2025-11-03) ⬅️ UPDATE
**Priority:** ~~HIGH~~ DONE ⬅️ UPDATE

#### Current State (2025-11-03) ⬅️ UPDATE DATE
- ✅ Rate limiting implemented (express-rate-limit v7.1.0) ⬅️ CHANGE
- ✅ All 6 APIs protected (100 req/15min per IP) ⬅️ CHANGE
- ✅ Proper 429 responses with Retry-After header ⬅️ CHANGE

#### Implementation Details ⬅️ ADD SECTION
**Date Fixed:** 2025-11-03
**Commit:** abc123def456
**PR:** #234 (if applicable)

**Files Modified:**
- ✅ packages/express-core/src/middleware/rateLimit.ts (created)
- ✅ packages/express-core/src/middleware/rateLimit.test.ts (created, 12 tests)
- ✅ apps/ezauth/api/src/index.ts (added middleware)
- ✅ apps/ezpay/api/src/index.ts (added middleware)
- ✅ apps/ezbill/api/src/index.ts (added middleware)
- ✅ apps/tower-defense/api/src/index.ts (added middleware)
- ✅ apps/green-pulse/api/src/index.ts (added middleware)
- ✅ apps/ezstart/api/src/index.ts (added middleware)

**Tests Added:** 12 tests
- Rate limit not exceeded (100 req OK)
- Rate limit exceeded (101st req = 429)
- Different IPs independent limits
- Retry-After header present
- Rate limit reset after 15min
- [7 more scenarios]

**Documentation Updated:**
- ✅ This audit (API-AUDIT.md)
- ✅ DEV-RULES.md (new rule about rate limiting)
- ✅ packages/express-core/README.md (rateLimit middleware)

#### Verification ⬅️ ADD SECTION
- ✅ All tests pass (334/334, including 12 new)
- ✅ TypeCheck pass (0 errors)
- ✅ Build succeeds (all packages)
- ✅ Manually tested on all 6 APIs
- ✅ Verified 429 response after 100 requests
- ✅ Verified Retry-After header correct

#### Before/After Metrics ⬅️ ADD SECTION
| Metric | Before | After |
|--------|--------|-------|
| APIs with rate limiting | 0/6 (0%) | 6/6 (100%) |
| Protection level | None | 100 req/15min |
| Tests coverage | 0 | 12 scenarios |
| Production ready | ❌ No | ✅ Yes |
```

**ET** mettre à jour le score en haut:

```markdown
# API Audit - @ezstart Monorepo

**Last Updated:** 2025-11-03 ⬅️ UPDATE
**Score:** 100/100 ⭐⭐⭐⭐⭐ EXCELLENT ⬅️ UPDATE (was 78)
```

**ET** ajouter à l'historique:

```markdown
## 📈 Progress Tracking

### Score History

| Date | Score | Change | Reason |
|------|-------|--------|--------|
| 2025-11-03 | 100/100 | +22 | Rate limiting implemented | ⬅️ ADD
| 2025-10-21 | 78/100 | - | Initial audit |
```

---

## ✅ Checklist Mise à Jour Audit

Après chaque amélioration, tu DOIS:

- [ ] Changer status ❌ → ✅
- [ ] Mettre à jour "Current State" section
- [ ] Ajouter "Implementation Details" section
- [ ] Ajouter "Verification" section
- [ ] Ajouter "Before/After Metrics" section (si applicable)
- [ ] Mettre à jour score en haut du fichier
- [ ] Mettre à jour "Last Updated" date
- [ ] Ajouter ligne dans "Score History"
- [ ] Ajouter dans "Recent Improvements"
- [ ] Recalculer "Score Breakdown" table

---

## 📊 Exemple Complet: Cycle Audit

### 1. Agent Analyse

```bash
$ grep -r "Status: ❌" docs/audits/

docs/audits/API-AUDIT.md:78:**Status:** ❌ Not Fixed (Rate Limiting, -22pts)
docs/audits/ACCESSIBILITY-AUDIT.md:45:**Status:** ❌ Not Fixed (ARIA, -7pts)
docs/audits/PERFORMANCE-AUDIT.md:92:**Status:** ❌ Not Fixed (Bundle, -5pts)
```

### 2. Agent Calcule Priorités

```
Rate Limiting: -22pts / 2h = 11.0 priority
ARIA Complete: -7pts / 3h = 2.3 priority
Bundle Size: -5pts / 2h = 2.5 priority

→ Recommandation: Rate Limiting first (highest priority)
```

### 3. Agent Propose

```markdown
## Amélioration Proposée

**Source:** docs/audits/API-AUDIT.md
**Problem:** Rate Limiting (ligne 78-105)
**Impact:** +22 points (78 → 100)
**Effort:** 2h

Implémenter?
```

### 4. Tu Valides

```
"ok go"
```

### 5. Agent Exécute

```
1. Implémente express-rate-limit ✅
2. Configure 6 APIs ✅
3. Créé 12 tests ✅
4. Tous les tests passent ✅
5. TypeCheck passe ✅
6. Build réussit ✅
```

### 6. Agent Met à Jour l'Audit

```diff
# docs/audits/API-AUDIT.md

- **Score:** 78/100
+ **Score:** 100/100 (+22 points)

- **Status:** ❌ Not Fixed
+ **Status:** ✅ Fixed (2025-11-03)

- ❌ No rate limiting implemented
+ ✅ Rate limiting implemented (express-rate-limit v7.1.0)
+
+ #### Implementation Details
+ [All details added]
```

### 7. Agent Commit

```bash
git commit -m "feat(api): implement rate limiting on all APIs

- Add express-rate-limit middleware
- Configure 100 req/15min per IP
- Tests: 12 scenarios (rate limit exceeded, reset, etc.)
- Documentation: DEV-RULES.md + packages/express-core/README.md

Impact: API Audit 78 → 100 (+22 points)
Updated: docs/audits/API-AUDIT.md

Fixes problem identified in API-AUDIT.md line 78-105
"
```

### 8. Agent Rapporte

```markdown
## ✅ Amélioration Terminée

**Audit:** API-AUDIT.md
**Problem:** Rate Limiting

**Score:**
- Before: 78/100
- After: 100/100
- Change: +22 points

**Implementation:**
- Files modified: 8
- Tests added: 12 (all pass ✅)
- Documentation updated: 3 files

**Verification:**
- ✅ TypeCheck pass
- ✅ Build pass
- ✅ Tests pass (334/334)
- ✅ Manually tested

**Audit Updated:**
- ✅ Status changed to Fixed
- ✅ Implementation details added
- ✅ Score updated
- ✅ History updated

**Next Recommended:**
Problem #2: Bundle Size (Performance Audit, +5pts, 2h)
Continue?
```

---

## 🎯 Format Standard de Proposition

Toujours utiliser ce format:

```markdown
# Propositions d'Amélioration

**Date:** YYYY-MM-DD
**Score Global:** X/100 (Goal: 100/100)
**Gap:** -Y points

---

## Analyse des Audits

**Audits analysés:** 17/17
**Problems identifiés:** Z problèmes

### Distribution des Problèmes

| Status | Count | Total Impact |
|--------|-------|--------------|
| ❌ Not Fixed | X | -YY points |
| ⏳ In Progress | X | -YY points |
| ✅ Fixed | X | +YY points |

### Audits avec Opportunités (Score < 90)

1. API (78/100) - Gap: -22 pts
2. Performance (82/100) - Gap: -18 pts
3. UX (80/100) - Gap: -20 pts

---

## Top 5 Améliorations (Par Priorité)

### 🥇 #1: [Problem Name]

**Source:** docs/audits/[AUDIT].md (ligne XX-YY)
**Audit:** [Audit Name] (Score: X/100)
**Impact:** +Y points (X → Z/100)
**Effort:** Zh
**Risk:** Low/Medium/High
**Priority:** Y/Z = W.X ⭐ HIGHEST

**Problem (from audit):**
[Copy "Current State" from audit]

**Solution (from audit):**
[Copy "Proposed Solution" from audit]

**Files to Modify (from audit):**
[Copy "Files to Modify" from audit]

**Tests Required (from audit):**
[Copy "Tests Required" from audit]

**Audit to Update:**
- docs/audits/[AUDIT].md

---

### 🥈 #2: [Next Problem]
[Same structure]

---

## Recommandation

**Quick Wins (Priority > 5.0):**
- #1: [Name] (Priority: W.X)

**Session Plan:**
- Do #1 + #3 = +X points
- Estimated time: Xh
- New score: Current → Target

**Veux-tu que je commence par #1?**
```

---

## 🚨 Erreurs à Éviter

### ❌ JAMAIS Faire

1. **Ne PAS créer de nouvelle documentation**
   - Tout dans les audits!

2. **Ne PAS oublier de mettre à jour l'audit**
   - Après chaque fix, update l'audit

3. **Ne PAS modifier le score sans justification**
   - Chaque changement = implementation details

4. **Ne PAS sauter la verification section**
   - Prouver que ça marche!

### ✅ TOUJOURS Faire

1. **Lire l'audit AVANT de proposer**
   - Source de vérité = audit

2. **Copier les sections de l'audit**
   - Current State, Solution, Files

3. **Mettre à jour TOUT dans l'audit**
   - Status, Score, History, Details

4. **Ajouter Before/After metrics**
   - Mesurable = crédible

---

## 📚 Résumé

**Workflow:**
```
1. Analyse audits (grep "❌")
2. Calcule priorités (Impact/Effort)
3. Propose top 5 (format standard)
4. Attends validation
5. Implémente (code + tests)
6. Met à jour l'audit (CRUCIAL!)
7. Commit (référence audit)
8. Rapporte (métriques)
```

**Source de vérité:**
- ✅ `docs/audits/*.md` (SEULE source)
- ❌ PAS de doc ailleurs

**Objectif:**
- Score global 84.8 → 100/100
- Chaque amélioration = audit mis à jour
- Historique complet = traçabilité

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
