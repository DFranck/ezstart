# 🤖 Mission: Autonomous Improvement Agent

**Role:** Autonomous agent following IMPROVEMENT-ROADMAP.md to improve monorepo from 72.1/100 → 85+/100

---

## 🎯 Mission Objectives

1. **Follow the roadmap** - Execute IMPROVEMENT-ROADMAP.md sequentially
2. **Maintain quality** - Apply DEV-RULES.md at all times
3. **Document everything** - Update docs, READMEs, progress tables
4. **Commit frequently** - One commit per completed item
5. **Work autonomously** - Don't ask for permission, execute the plan

---

## 📋 Instructions

### Phase 1: Quick Wins (20h, Target: 77.3/100)

**Execute in order:**

#### Item 1: Sentry Setup (4h) - ✅ COMPLETED (ALL 6 APIs)
- [x] Created Sentry organization "ezstart" (https://ezstart.sentry.io)
- [x] Created 6 Sentry projects (EZAuth, EZPay, Monitoring, EZBill, TD, GreenPulse)
- [x] Centralized Sentry config in @ezstart/logger/sentry.ts
- [x] Created instrument.mts pattern for ESM modules
- [x] Migrated ALL 6 APIs to centralized Sentry
- [x] Tested all 6 APIs with /debug-sentry endpoints
- [x] Removed test endpoints after validation
- [x] Fixed critical bug: setupExpressErrorHandler AFTER routes
- [x] Documented Sentry architecture in CLAUDE.md (150+ lines)
- [x] Reduced code duplication by 75% (28 lines → 7 lines per API)
- [x] Update MONITORING-AUDIT.md score: 35 → 80 (+45 points)
- [x] Commit 1: "feat: centralize Sentry error tracking for 3 critical APIs" (3ef9dda)
- [x] Commit 2: "feat: add Sentry error tracking to 3 remaining APIs" (3d39db0)
- [x] Commit 3: "docs: update monitoring score and complete Sentry migration" (3b80529)

#### Item 2: Structured Logging (4h) - ✅ COMPLETED
- [x] Install pino and pino-pretty
- [x] Create packages/logger (not utils) - dedicated package
- [x] Replace console.log in express-core (mongo.ts, startServer.ts)
- [x] Migrate Tower Defense API/Web (14 files)
- [x] Remove logger from @ezstart/ui (clean architecture)
- [x] Create backward compatibility wrapper
- [x] Create packages/logger/README.md with full documentation
- [x] Update MONITORING-AUDIT.md score: 35 → 70
- [x] Commit: "feat(monitoring): add structured logging with Pino" (687a964)

#### Item 3: robots.txt + sitemap.xml (2h) - ✅ ALREADY DONE
- [x] Verified app/robots.ts exists in all 8 web apps
- [x] Verified app/sitemap.ts exists in all 8 web apps
- [x] All use @ezstart/seo-config for centralized configuration
- [x] Update SEO-AUDIT.md score: 54 → 65
- [x] Commit: "docs(seo): update audit - robots.txt and sitemap.xml already implemented"

#### Item 4: Open Graph Tags (3h) - ✅ COMPLETED
- [x] Add Open Graph metadata to layout.tsx in each web app
- [x] Generate OG images for each app (1200x630 SVG placeholders)
- [x] Add Twitter Card metadata
- [x] Use @ezstart/seo-config/metadata createMetadata helper
- [x] Update SEO-AUDIT.md score: 65 → 80 (+15 points)
- [x] Commit: "feat(seo): add Open Graph and Twitter Card metadata to all apps"

#### Item 5: JSON-LD Structured Data (1h) - ✅ COMPLETED
- [x] Created @ezstart/seo-config/json-ld with createJsonLd helper
- [x] Added JSON-LD WebApplication schema to all 8 web apps
- [x] Used appropriate applicationCategory for each app
- [x] Update SEO-AUDIT.md score: 80 → 85 (+5 points)
- [x] Commit: "feat(seo): add JSON-LD structured data for all apps"

#### Item 6: Root README.md (2h) - ✅ COMPLETED
- [x] Create comprehensive README.md at root
- [x] Include Quick Start, Architecture, Apps list, Health score
- [x] Add links to CLAUDE.md, DEV-RULES.md, docs/README.md
- [x] Test all links work
- [x] Update DOCUMENTATION-AUDIT.md score: 68 → 75 (+7 points)
- [x] Commit: "docs: create comprehensive root README.md"

#### Item 7: Package READMEs (4h) - ✅ ALREADY DONE (by another agent)
- [x] Create README.md for packages/types (247 lines)
- [x] Create README.md for packages/next-config (361 lines)
- [x] Create README.md for packages/tailwind-config (405 lines)
- [x] Create README.md for packages/eslint-config (395 lines)
- [x] Create README.md for packages/typescript-config (627 lines)
- [x] Each README includes: Overview, Installation, Usage, Examples, Used By
- [x] Update DOCUMENTATION-AUDIT.md score: 75 → 85 (+10 points)
- [x] All 14 packages now have READMEs (100% coverage)

**Phase 1 Completion:**
- [x] Update IMPROVEMENT-ROADMAP.md progress table (mark items ✅)
- [x] Update docs/README.md with new global score (72.1 → 77.5)
- [x] Verify all commits are pushed
- [x] Commit: "docs: finalize Phase 1 completion - global score 77.5/100" (14e221b)

---

### Phase 2: Infrastructure Hardening (40h, Target: 81.1/100)

**Execute after Phase 1 is 100% complete:**

#### Item 8: i18n Migration (8h) - ✅ COMPLETED (EN/FR only)
- [x] Migrated EZAuth web to next-intl with EN/FR translations
- [x] Created messages/en/ and messages/fr/ (common, auth, layout)
- [x] Restructured app/ → [locale]/ for locale routing
- [x] Updated next.config.js with next-intl plugin
- [x] Commit: "feat(i18n): migrate EZAuth web to next-intl with EN/FR (WIP 95%)" (5fbf28c)
- [x] Migrated EZBill web to next-intl with EN/FR translations
- [x] Created messages/en/ and messages/fr/ (common, billing, layout)
- [x] Applied same restructuring pattern as EZAuth
- [x] Commit: "feat(i18n): migrate EZBill web to next-intl with EN/FR" (0138564)
- [x] Migrated EZPay web to next-intl with EN/FR translations
- [x] Created messages/en/ and messages/fr/ (common, payment, layout)
- [x] Applied same restructuring pattern as EZAuth/EZBill
- [x] Commit: "feat(i18n): migrate EZPay web to next-intl with EN/FR" (900740d)
- [x] Refactored all 3 apps to use centralized @ezstart/next-config i18n option
- [x] Simplified next.config.js: createNextConfig({ i18n: true })
- [x] Commit: "refactor(i18n): use centralized i18n option from @ezstart/next-config" (0cad39a)
- [x] Updated I18N-AUDIT.md score: 65 → 85 (+20 points)
- [x] 100% monorepo i18n coverage (8/8 apps with next-intl)
- [x] Commit: "docs: update i18n audit to reflect 100% next-intl coverage" (9338d7f)
- [x] Updated IMPROVEMENT-ROADMAP.md with i18n completion
- [x] Commit: "docs: mark i18n migration complete in improvement roadmap" (e239aaf)

**Note:** Spanish (ES) translations not done yet (future: 85 → 90)

#### Item 9: Spanish Translations (6h) - ⏳ NOT DONE YET
- [ ] ... (deferred to later)

#### Item 10-12: Accessibility (12h) - ⏸️ DEFERRED
- [x] Foundation completed (focus-visible, @axe-core/react installed)
- [x] Score improved: 72 → 76 (+4 points, +0.25 global)
- [ ] Full accessibility audit deferred - Reason: Should fix once in @ezstart/ui, not per app
- [ ] Manual testing (keyboard nav, screen reader) - To do later when standardizing UI components
- [ ] ARIA labels fixes - To do in @ezstart/ui package for all apps at once

**Note:** Accessibility improvements should follow "single source of truth" principle.
Fixing in @ezstart/ui = 8 apps fixed automatically. Deferred until time for proper UI standardization.

#### Item 13-15: UX Polish (14h) - ⏸️ DEFERRED
- [ ] Loading states (Skeleton screens) - Deferred to @ezstart/ui audit
- [ ] Error states (Error boundaries) - Deferred to @ezstart/ui audit
- [ ] Empty states - Deferred to @ezstart/ui audit

**Note:** UX improvements should be done in @ezstart/ui package to benefit all 8 apps at once.
Creating Skeleton, EmptyState, ErrorBoundary components once = 8 apps improved automatically.
Combined with Accessibility audit for comprehensive UI component overhaul.

**Phase 2 Completion:**
- [ ] Update progress table, scores, commit

---

### Phase 3: Testing (76h, Target: 85.2/100)

**Execute after Phase 2 is 100% complete:**

#### Item 16-18: Tests (76h)
- [ ] ... (details in IMPROVEMENT-ROADMAP.md)

**Phase 3 Completion:**
- [ ] Update progress table, scores, commit
- [ ] Celebrate 🎉 Score 72.1 → 85.2!

---

## 📏 Rules (MANDATORY)

### Must Follow DEV-RULES.md

**Critical rules to apply:**
1. ✅ ALWAYS use components from @ezstart/ui (NEVER HTML natives)
2. ✅ ALWAYS use semantic colors (NEVER hardcoded like bg-gray-100)
3. ✅ ALWAYS check packages/ before creating new code
4. ✅ ALWAYS update README when modifying packages
5. ✅ ALWAYS use connectToMongo(dbName) for MongoDB (singleton pattern)
6. ✅ ALWAYS use @ezstart/config for URLs/ports
7. ✅ ALWAYS structured commits (conventional commits format)
8. ✅ ALWAYS typecheck before commit (pnpm typecheck)

### Commit Message Format

```
type(scope): brief description

- Detailed change 1
- Detailed change 2
- Impact/results

[No Claude attribution lines]
```

**Types:** feat, fix, docs, refactor, perf, test, chore

### Quality Gates

**Before each commit:**
- [ ] TypeScript builds without errors (`pnpm typecheck`)
- [ ] ESLint passes (warnings OK, no errors)
- [ ] README updated if package modified
- [ ] Progress table updated in IMPROVEMENT-ROADMAP.md

**After each phase:**
- [ ] All items marked ✅ in progress table
- [ ] Audit scores updated in respective audit files
- [ ] Global score updated in docs/README.md
- [ ] All commits pushed to git

---

## 🎯 Success Criteria

**Phase 1 Success:**
- ✅ Monitoring score: 35 → 70
- ✅ SEO score: 54 → 85
- ✅ Documentation score: 68 → 85
- ✅ Global score: 72.1 → 77.3
- ✅ All 7 items committed separately
- ✅ Progress table 100% complete

**Phase 2 Success:**
- ✅ i18n score: 65 → 90
- ✅ Accessibility score: 74 → 90
- ✅ UX score: 70 → 90
- ✅ Global score: 77.3 → 81.1

**Phase 3 Success:**
- ✅ Testing score: 15 → 80
- ✅ Global score: 81.1 → 85.2
- ✅ Project status: Good → **Excellent**

---

## 🚨 When to Stop and Ask

**Stop autonomous mode and notify user if:**

1. ❌ TypeScript errors that can't be auto-fixed
2. ❌ Breaking changes detected (need user decision)
3. ❌ External service configuration needed (Sentry account, API keys)
4. ❌ Uncertain about architecture decision
5. ❌ Phase completed successfully (ask: continue to next phase?)

**Otherwise:** Keep executing autonomously until phase completion.

---

## 📊 Progress Tracking

**Update this section after each item:**

### Phase 1 Progress

| Item | Status | Time Spent | Commit SHA | Notes |
|------|--------|------------|------------|-------|
| 1. Sentry | ✅ Complete | 4h | 3ef9dda, 3d39db0, 3b80529 | Monitoring 35→80 (+45pts), ALL 6 APIs |
| 2. Logging | ✅ Complete | 1.5h | 687a964 | Monitoring 35→70 (+35pts) |
| 3. robots.txt | ✅ Complete | 0.2h | a1cf6d4 | Already existed, updated audit |
| 4. Open Graph | ✅ Complete | 1h | 3dea828 | SEO 65→80 (+15pts), 8 SVG images |
| 5. JSON-LD | ✅ Complete | 0.8h | 363ac48 | SEO 80→85 (+5pts), schema-dts |
| 6. Root README | ✅ Complete | 1.2h | 6e5ef01 | Documentation 68→75 (+7pts), 297 lines |
| 7. Package READMEs | ✅ Complete | 0h | N/A | Already done by another agent, 100% coverage |

**Phase 1 Status: ✅ COMPLETE (7/7 items)**
**Global Score: 72.1 → 77.5 (+5.4 points)**

### Phase 2 Progress

| Item | Status | Time Spent | Commit SHA | Notes |
|------|--------|------------|------------|-------|
| 8. i18n Migration | ✅ Complete | 6h | 5fbf28c, 0138564, 900740d, 0cad39a, 9338d7f, e239aaf | i18n 65→85 (+20pts), 8/8 apps EN/FR |
| 9. Spanish Translations | ⏳ Pending | 0h | - | Deferred to later |
| 10-12. Accessibility | ⏸️ Deferred | 1h | 200dc09, 44e78a2, f218f4f, 8807bd0 | Foundation only: 72→76 (+0.25 global), full audit deferred to UI standardization |

**Phase 2 Status: 🔄 IN PROGRESS (1.5/6 items)**
**Global Score: 77.5 → 77.8 (+0.3 points since i18n)**

**Status:** ⏳ Pending | 🔄 In Progress | ✅ Complete | ❌ Blocked

---

## 🎯 How to Use This Mission

### For User (You):

```bash
# Start autonomous agent
claude "Execute .claude/missions/autonomous-improvement.md Phase 1"

# Check progress anytime
cat .claude/missions/autonomous-improvement.md

# Resume if interrupted
claude "Continue .claude/missions/autonomous-improvement.md from last checkpoint"
```

### For Claude (Me):

1. ✅ Read this entire mission file
2. ✅ Read DEV-RULES.md (mandatory rules)
3. ✅ Read IMPROVEMENT-ROADMAP.md (detailed instructions)
4. ✅ Execute items sequentially
5. ✅ Update progress table after each item
6. ✅ Commit after each item
7. ✅ Continue until phase complete
8. ✅ Notify user when phase done

---

**Created:** 2025-10-21
**Mission Type:** Autonomous Improvement
**Expected Duration:** 20h (Phase 1), 40h (Phase 2), 76h (Phase 3)
**Goal:** Transform monorepo from 72.1/100 (Good) → 85.2/100 (Excellent)
