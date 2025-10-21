# 🤖 Claude Configuration - @ezstart Monorepo

This directory contains configuration and mission files for Claude AI agents working on this monorepo.

---

## 📂 Directory Structure

```
.claude/
├── README.md                          # This file (how to use Claude configs)
├── missions/                          # Autonomous agent missions
│   └── autonomous-improvement.md     # Auto-follow IMPROVEMENT-ROADMAP.md
└── contexts/                          # (Future) Role-specific contexts
    ├── architect.md                  # (Future) Architect/Auditor role
    ├── developer.md                  # (Future) Developer/Executor role
    └── reviewer.md                   # (Future) Code Reviewer role
```

---

## 🎯 Two Modes of Operation

### Mode 1: Interactive Development (Default)

**When:** You want to work WITH Claude, explaining what you want

**How to use:**
1. Open Claude Code (VS Code extension)
2. Explain what you want: "Create a new API endpoint for invoices"
3. Claude asks questions, suggests solutions
4. You approve, Claude implements
5. Iterate together

**Context:** Claude automatically reads:
- `CLAUDE.md` - Complete monorepo documentation
- `DEV-RULES.md` - Mandatory development rules
- `docs/README.md` - Audit dashboard
- Any file you mention or open

**No special config needed** - Just talk naturally!

---

### Mode 2: Autonomous Agent (Mission-based)

**When:** You want Claude to work ALONE, following a predefined plan

**How to use:**

#### Option A: Command Line
```bash
# Execute entire Phase 1 autonomously
claude "Execute .claude/missions/autonomous-improvement.md Phase 1"

# Check progress
cat .claude/missions/autonomous-improvement.md | grep "Status"

# Resume if interrupted
claude "Continue .claude/missions/autonomous-improvement.md from last checkpoint"
```

#### Option B: In Chat
```
You: "Start autonomous mode: Execute Phase 1 of improvement roadmap"

Claude: *Reads .claude/missions/autonomous-improvement.md*
        *Executes Item 1 (Sentry setup)*
        *Commits*
        *Updates progress table*
        *Continues to Item 2...*

        [4 hours later]

Claude: "✅ Phase 1 Item 1 complete (Sentry setup)
         - Installed @sentry/node + @sentry/nextjs
         - Configured 5 APIs + 8 web apps
         - Tested error capture
         - Commit: abc123f
         - Monitoring score: 35 → 40

         Starting Item 2 (Structured Logging)..."
```

---

## 📋 Available Missions

### 1. Autonomous Improvement (`missions/autonomous-improvement.md`)

**Goal:** Follow IMPROVEMENT-ROADMAP.md to improve score from 72.1 → 85.2

**Phases:**
- Phase 1: Quick Wins (20h, +5.2 pts)
- Phase 2: Infrastructure (40h, +3.8 pts)
- Phase 3: Testing (76h, +4.1 pts)

**Features:**
- ✅ Fully autonomous execution
- ✅ Commits after each item
- ✅ Updates progress table
- ✅ Updates audit scores
- ✅ Follows DEV-RULES.md strictly

**When to use:**
- You want the project to improve while you sleep/work on other things
- You trust the roadmap and want it executed exactly as written
- You want consistent, rule-following implementation

**Example:**
```bash
# Start Phase 1 (20h of work)
claude "Execute .claude/missions/autonomous-improvement.md Phase 1"

# Come back later, check progress
git log --oneline -10  # See commits
cat .claude/missions/autonomous-improvement.md  # See progress table
```

---

## 🎛️ Autonomous Agent Behavior

### What Claude WILL Do Autonomously

✅ **Execute the plan** - Follow mission instructions sequentially
✅ **Read documentation** - DEV-RULES.md, IMPROVEMENT-ROADMAP.md, audits
✅ **Write code** - Implement features, fix issues
✅ **Update docs** - READMEs, audit scores, progress tables
✅ **Commit frequently** - One commit per completed item
✅ **Apply rules** - Follow DEV-RULES.md 100%
✅ **Test changes** - Run typecheck, build, verify functionality
✅ **Continue automatically** - Move to next item without asking

### What Claude WON'T Do (Will Stop and Ask)

❌ **Breaking changes** - Major architecture changes need approval
❌ **External config** - Creating Sentry account, getting API keys
❌ **Uncertain decisions** - Ambiguous requirements
❌ **TypeScript errors** - Errors that can't be auto-fixed
❌ **User input needed** - Design choices, business decisions

**When stopped, Claude will:**
1. Explain what's blocking
2. Ask for your input/decision
3. Wait for your response
4. Resume autonomous mode after clarification

---

## 📏 Rules Applied in Autonomous Mode

### DEV-RULES.md (Mandatory)

All autonomous work follows these rules:

1. ✅ **UI Components** - Use @ezstart/ui, NEVER HTML natives
2. ✅ **Semantic Colors** - Use classes like bg-card, NEVER bg-gray-100
3. ✅ **Package Hierarchy** - Check packages/ first, reuse before creating
4. ✅ **MongoDB** - Use getMongo(), NEVER mongoose.connect()
5. ✅ **URLs/Ports** - Use @ezstart/config, NEVER hardcode
6. ✅ **Documentation** - Update README when modifying packages
7. ✅ **TypeScript** - strict mode, composite: true, no errors
8. ✅ **Commits** - Conventional commits format, detailed messages

See [DEV-RULES.md](../DEV-RULES.md) for complete list.

### Quality Gates (Before Each Commit)

```bash
# Claude runs these automatically:
pnpm typecheck    # Must pass (0 errors)
pnpm lint         # Warnings OK, no errors
pnpm build        # Must succeed for modified packages
```

---

## 🎯 How to Create New Missions

### Mission File Template

```markdown
# 🤖 Mission: [Name]

**Role:** [Agent role description]

---

## 🎯 Mission Objectives

1. Objective 1
2. Objective 2

---

## 📋 Instructions

### Step 1: [Name]
- [ ] Action 1
- [ ] Action 2
- [ ] Commit: "commit message"

### Step 2: [Name]
- [ ] Action 1
- [ ] Commit: "commit message"

---

## 📏 Rules (MANDATORY)

- Rule 1
- Rule 2

---

## 🚨 When to Stop and Ask

1. Condition 1
2. Condition 2

---

## 📊 Progress Tracking

| Step | Status | Notes |
|------|--------|-------|
| 1    | ⏳     |       |
```

### Starting a Custom Mission

```bash
# Create your mission
.claude/missions/my-custom-mission.md

# Execute it
claude "Execute .claude/missions/my-custom-mission.md"
```

---

## 🔄 Resuming Interrupted Missions

**If Claude stops (error, timeout, manual stop):**

```bash
# Check last completed step
cat .claude/missions/autonomous-improvement.md | grep "✅"

# Resume from checkpoint
claude "Continue .claude/missions/autonomous-improvement.md from last checkpoint"
```

**Claude will:**
1. Read progress table
2. Find last ✅ completed item
3. Resume from next ⏳ pending item
4. Continue autonomously

---

## 📚 Related Documentation

### Must Read for All Modes

- **[CLAUDE.md](../CLAUDE.md)** - Complete monorepo documentation (5000+ lines)
- **[DEV-RULES.md](../DEV-RULES.md)** - Mandatory development rules (1000+ lines)
- **[docs/README.md](../docs/README.md)** - Audit dashboard (16/16 complete)
- **[docs/IMPROVEMENT-ROADMAP.md](../docs/IMPROVEMENT-ROADMAP.md)** - Improvement strategy

### Autonomous Mode Specific

- **[.claude/missions/autonomous-improvement.md](./.missions/autonomous-improvement.md)** - Main autonomous mission

---

## 🎯 Quick Start Guide

### For Interactive Development (Mode 1)

```bash
# Just open Claude Code and talk!
"Create a new component for displaying invoices"
"Fix the TypeScript error in auth-sdk"
"Add a new API endpoint for payments"
```

### For Autonomous Agent (Mode 2)

```bash
# Start Phase 1 (20 hours of autonomous work)
claude "Execute .claude/missions/autonomous-improvement.md Phase 1"

# Check progress periodically
watch -n 300 'git log --oneline -5'  # Every 5 minutes

# When Phase 1 done, start Phase 2
claude "Execute .claude/missions/autonomous-improvement.md Phase 2"
```

---

## 🚨 Safety & Rollback

### If Autonomous Agent Makes a Mistake

```bash
# Revert last commit
git revert HEAD

# Or reset to before autonomous session
git reset --hard <commit-before-autonomous>

# Update progress table
# Mark failed item as ❌ Blocked with notes
```

### Pausing Autonomous Mode

```
You: "Stop autonomous mode"
Claude: *Finishes current item*
        *Commits*
        *Updates progress table*
        *Stops and waits*

You: "Resume"
Claude: *Continues from next item*
```

---

## 🎯 Success Metrics

### Phase 1 Success (After autonomous-improvement.md Phase 1)

- ✅ 7 commits (one per item)
- ✅ Monitoring: 35 → 70
- ✅ SEO: 54 → 85
- ✅ Documentation: 68 → 85
- ✅ Global score: 72.1 → 77.3
- ✅ All items marked ✅ in progress table
- ✅ 0 TypeScript errors
- ✅ All docs updated

### Phase 2 Success

- ✅ 3 major improvements (i18n, A11y, UX)
- ✅ Global score: 77.3 → 81.1
- ✅ International-ready
- ✅ WCAG compliant

### Phase 3 Success

- ✅ 60%+ test coverage
- ✅ Global score: 81.1 → 85.2
- ✅ Project status: **Excellent**

---

**Created:** 2025-10-21
**Maintainer:** @ezstart team
**Purpose:** Enable both interactive and autonomous development with Claude AI
