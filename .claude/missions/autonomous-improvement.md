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

#### Item 1: Sentry Setup (4h)
- [ ] Install @sentry/node and @sentry/nextjs
- [ ] Configure in apps/ezauth/api/src/index.ts
- [ ] Configure in apps/ezauth/web/sentry.client.config.js
- [ ] Repeat for apps/ezpay/api, ezbill/api, tower-defense/api, green-pulse/api
- [ ] Test error capture in each service
- [ ] Add SENTRY_DSN to .env.example files
- [ ] Update MONITORING-AUDIT.md score: 35 → 40
- [ ] Commit: "feat(monitoring): setup Sentry error tracking for all APIs"

#### Item 2: Structured Logging (4h)
- [ ] Install pino and pino-pretty
- [ ] Create packages/utils/src/logger.ts
- [ ] Replace console.log with logger in all APIs
- [ ] Replace console.log with logger in all web apps
- [ ] Test logs in development and production
- [ ] Update packages/utils/README.md with logger usage
- [ ] Update MONITORING-AUDIT.md score: 40 → 70
- [ ] Commit: "feat(monitoring): add structured logging with Pino"

#### Item 3: robots.txt + sitemap.xml (2h)
- [ ] Create app/robots.ts in each web app (8 apps)
- [ ] Create app/sitemap.ts in each web app (8 apps)
- [ ] Test robots.txt at /robots.txt
- [ ] Test sitemap.xml at /sitemap.xml
- [ ] Update SEO-AUDIT.md score: 54 → 65
- [ ] Commit: "feat(seo): add robots.txt and sitemap.xml to all web apps"

#### Item 4: Open Graph Tags (3h)
- [ ] Add Open Graph metadata to layout.tsx in each web app
- [ ] Generate or find OG images for each app (1200x630)
- [ ] Add Twitter Card metadata
- [ ] Test social sharing previews
- [ ] Update SEO-AUDIT.md score: 65 → 80
- [ ] Commit: "feat(seo): add Open Graph and Twitter Card metadata"

#### Item 5: JSON-LD Structured Data (1h)
- [ ] Add Organization schema to layout.tsx in each web app
- [ ] Test with Google Rich Results Test
- [ ] Update SEO-AUDIT.md score: 80 → 85
- [ ] Commit: "feat(seo): add JSON-LD structured data for all apps"

#### Item 6: Root README.md (2h)
- [ ] Create comprehensive README.md at root
- [ ] Include Quick Start, Architecture, Apps list, Health score
- [ ] Add links to CLAUDE.md, DEV-RULES.md, docs/README.md
- [ ] Test all links work
- [ ] Update DOCUMENTATION-AUDIT.md score: 68 → 75
- [ ] Commit: "docs: create comprehensive root README.md"

#### Item 7: Package READMEs (4h)
- [ ] Create README.md for packages/types
- [ ] Create README.md for packages/utils
- [ ] Create README.md for packages/next-config
- [ ] Create README.md for packages/tailwind-config
- [ ] Create README.md for packages/eslint-config
- [ ] Create README.md for packages/typescript-config
- [ ] Each README includes: Overview, Installation, Usage, Examples, Used By
- [ ] Update DOCUMENTATION-AUDIT.md score: 75 → 85
- [ ] Commit: "docs: add READMEs for 6 missing packages"

**Phase 1 Completion:**
- [ ] Update IMPROVEMENT-ROADMAP.md progress table (mark items ✅)
- [ ] Update docs/README.md with new global score (72.1 → 77.3)
- [ ] Verify all commits are pushed
- [ ] Commit: "docs: complete Phase 1 of improvement roadmap"

---

### Phase 2: Infrastructure Hardening (40h, Target: 81.1/100)

**Execute after Phase 1 is 100% complete:**

#### Item 8-9: i18n Migration (14h)
- [ ] ... (details in IMPROVEMENT-ROADMAP.md)

#### Item 10-12: Accessibility (12h)
- [ ] ... (details in IMPROVEMENT-ROADMAP.md)

#### Item 13-15: UX Polish (14h)
- [ ] ... (details in IMPROVEMENT-ROADMAP.md)

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
5. ✅ ALWAYS use getMongo() for MongoDB (NEVER mongoose.connect)
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
| 1. Sentry | ⏳ | 0h | - | Starting... |
| 2. Logging | ⏳ | 0h | - | Waiting |
| 3. robots.txt | ⏳ | 0h | - | Waiting |
| 4. Open Graph | ⏳ | 0h | - | Waiting |
| 5. JSON-LD | ⏳ | 0h | - | Waiting |
| 6. Root README | ⏳ | 0h | - | Waiting |
| 7. Package READMEs | ⏳ | 0h | - | Waiting |

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
