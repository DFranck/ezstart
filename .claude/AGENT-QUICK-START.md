# 🤖 AI Agent Quick Start Guide

> **Copy this file to new projects** to ensure AI agents follow your standards.

---

## 📋 Essential Rules (NON-NEGOTIABLE)

### 1. UI Components - ALWAYS Use Component Library

```tsx
// ❌ NEVER use raw HTML
<div className="bg-white p-4">
  <button>Click me</button>
</div>

// ✅ ALWAYS use component library
import { Card, Button } from '@project/ui'
<Card>
  <Button>Click me</Button>
</Card>
```

**Rule:** Never use `<div>`, `<button>`, `<input>`, `<h1>`, etc. Always use semantic components.

---

### 2. Colors - ALWAYS Use Semantic Classes

```tsx
// ❌ NEVER hardcode colors
<div className="bg-gray-100 text-gray-900">

// ✅ ALWAYS use semantic classes
<div className="bg-card text-foreground">
```

**Available semantic classes:**
- Background: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Primary: `bg-primary`, `text-primary-foreground`
- Border: `border`

**Why:** Dark mode support, consistency, maintainability

---

### 3. Package Hierarchy - Check Before Creating

**Before creating new code, check in this order:**

1. **`packages/`** - Is it reusable across projects?
2. **`app/[project]/[shared]`** - Is it shared between web/api of same project?
3. **`app/[project]/web|api`** - Only if specific to one layer

**Rule:** ALWAYS search existing code before creating new functionality.

```bash
# Search for similar functionality
grep -r "functionName" packages/
glob "**/*component-name*"
```

---

### 4. TypeScript - Strict Mode Always

```typescript
// ❌ NEVER
const data: any = response
// @ts-ignore
const user = data.user

// ✅ ALWAYS
interface Response {
  user: User
}
const data: Response = response
const user = data.user
```

**Rules:**
- ✅ `strict: true` in tsconfig
- ✅ No `any` types
- ✅ No `@ts-ignore`
- ✅ Run `pnpm typecheck` before committing

---

### 5. Commits - Clear & Detailed

```bash
# ❌ BAD
git commit -m "fix stuff"

# ✅ GOOD
git commit -m "fix(auth): prevent race condition in token refresh

Problem:
- Token refresh triggered multiple times simultaneously
- Caused 401 errors on concurrent requests

Solution:
- Added mutex lock to refresh function
- Prevents duplicate refresh requests

Impact:
- Fixes intermittent auth failures
- Improves user experience"
```

**Format:** `type(scope): brief description\n\n[detailed explanation]`

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

### 6. Documentation - Update as You Go

**ALWAYS update these when modifying code:**

| Modified | Must Update |
|----------|-------------|
| Package code | `packages/[name]/README.md` |
| New pattern | `CLAUDE.md` or equivalent |
| Architecture | `docs/ARCHITECTURE.md` |
| Breaking change | `CHANGELOG.md` + migration guide |

**Rule:** If you read docs to understand code, improve those docs for next person.

---

## 🔍 Before Starting ANY Task

### Checklist:
1. [ ] Read project's `README.md`
2. [ ] Read `CLAUDE.md` or `.claude/README.md` if exists
3. [ ] Check `DEV-RULES.md` if exists
4. [ ] Understand monorepo/project structure
5. [ ] Search for similar existing code
6. [ ] Check recent commits for context

---

## 🚀 Development Workflow

### 1. Understand the Request
```
User: "Add a login form"

Think:
- Does a login form component already exist?
- Is there an auth package I should use?
- What's the existing auth pattern?
```

### 2. Search Existing Code
```bash
# Find similar components
grep -r "LoginForm" .
glob "**/login*"

# Check package structure
ls packages/
```

### 3. Plan Your Changes
```
If component exists:
  → Reuse and extend it

If no component:
  → Check if auth package exists
  → Follow existing patterns
  → Create in correct layer
```

### 4. Implement
```typescript
// Follow existing patterns
// Use semantic components
// Add TypeScript types
// Write clean, readable code
```

### 5. Test
```bash
# Always run before committing
pnpm typecheck
pnpm lint
pnpm build  # For modified packages
```

### 6. Document
```markdown
# Update README.md
## New Feature: Login Form

Usage:
\`\`\`tsx
import { LoginForm } from '@project/auth'
<LoginForm onSuccess={handleLogin} />
\`\`\`
```

### 7. Commit
```bash
git add .
git commit -m "feat(auth): add reusable LoginForm component

- Supports email/password authentication
- Built-in validation
- Error handling with toast notifications
- Integrates with @project/auth-sdk

Usage: See packages/auth/README.md"
```

---

## ❌ Common Mistakes to Avoid

### Mistake 1: Creating Duplicate Code
```tsx
// ❌ Creating new button component
// packages/ui/components/new-button.tsx

// ✅ First check if Button already exists
// packages/ui/components/button.tsx ← Already exists!
```

**Solution:** ALWAYS search before creating.

---

### Mistake 2: Hardcoding Values
```typescript
// ❌ Hardcoded URL
fetch('http://localhost:5000/api/users')

// ✅ Use config
import { API_URL } from '@project/config'
fetch(`${API_URL}/users`)
```

**Solution:** Use centralized config for URLs, ports, API keys.

---

### Mistake 3: Ignoring TypeScript Errors
```typescript
// ❌ Ignoring error
// @ts-ignore
const data = response.data

// ✅ Fix the type
interface ApiResponse {
  data: User[]
}
const response: ApiResponse = await fetch(...)
const data = response.data
```

**Solution:** Fix types, don't ignore them.

---

### Mistake 4: Vague Commit Messages
```bash
# ❌ Vague
"updated files"

# ✅ Clear
"fix(api): add userId validation to /invoices endpoint

- Prevents accessing other users' invoices
- Returns 401 if userId header missing
- Adds test for authorization check"
```

**Solution:** Explain WHAT, WHY, and HOW.

---

## 🎯 Quality Standards

### Before Every Commit:
- [ ] Code compiles (`pnpm typecheck` passes)
- [ ] No ESLint errors
- [ ] Documentation updated
- [ ] Commit message is clear
- [ ] No secrets committed
- [ ] Tests pass (if tests exist)

### Before Every PR/Push:
- [ ] All commits follow convention
- [ ] README updated if patterns changed
- [ ] Breaking changes documented
- [ ] Migration guide if needed

---

## 🧪 Testing Guidelines

```typescript
// Example test structure
describe('LoginForm', () => {
  it('should validate email format', () => {
    // Test implementation
  })

  it('should show error on failed login', async () => {
    // Test implementation
  })

  it('should call onSuccess on successful login', async () => {
    // Test implementation
  })
})
```

**Rules:**
- ✅ Write tests for new features
- ✅ Update tests when modifying code
- ✅ Test happy path AND error cases
- ✅ Use descriptive test names

---

## 📚 Project-Specific Patterns

### Pattern 1: API Calls
```typescript
// Standard pattern for API calls
import { callApi, parseApiError } from '@/utils/api'

const response = await callApi<User>('/users', {
  method: 'POST',
  body: userData,
})

if (!response.ok) {
  throw new Error(parseApiError(response.data))
}

const user = response.data
```

### Pattern 2: React Query
```typescript
// Standard React Query hook
export function useUsers() {
  const userId = getUserId()

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await callApi<User[]>('/users', { userId })
      if (!res.ok) throw new Error(parseApiError(res.data))
      return res.data
    },
    enabled: !!userId, // Only run when userId available
  })
}
```

### Pattern 3: Error Handling
```typescript
// Standard error handling with toast
import { runWithFeedback } from '@/utils/api'

await runWithFeedback({
  action: async () => {
    // Your async operation
  },
  toastLoading: { message: 'Processing...' },
  toastSuccess: { message: 'Success!' },
  toastError: { message: 'Failed to process' },
})
```

---

## 🔧 Tools & Commands

### Essential Commands
```bash
# TypeScript check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Test
pnpm test

# Dev mode
pnpm dev
```

### Debugging
```bash
# Search codebase
grep -r "search term" .
grep -r "componentName" packages/

# Find files
find . -name "*component*"

# Check git history
git log --oneline -20
git log -p path/to/file  # See file history
```

---

## 💡 Pro Tips

### Tip 1: Read Tests First
Tests are often the best documentation. They show:
- How to use the code
- What inputs are expected
- What outputs are returned
- Edge cases to consider

### Tip 2: Follow Git History
```bash
git log -p path/to/file
```
Shows WHY decisions were made, not just WHAT changed.

### Tip 3: Search Before Asking
```bash
# Most answers are in the codebase
grep -r "pattern" .
```

### Tip 4: Small Commits
Better: 10 small, focused commits
Worse: 1 massive commit with everything

### Tip 5: Document As You Learn
If something confused you, it will confuse others.
Add a comment or update the README.

---

## 🚨 When to Stop and Ask

**ALWAYS ask before:**
- Making breaking changes
- Changing core architecture
- Adding new dependencies
- Modifying build config
- Changing API contracts
- Removing existing features

**DON'T ask for:**
- Following established patterns
- Fixing obvious bugs
- Adding comments/docs
- Formatting code
- Writing tests

---

## 📖 Where to Find Information

### Project Structure
```
README.md           ← Start here
CLAUDE.md           ← Full dev guide
DEV-RULES.md        ← Non-negotiable rules
.claude/            ← AI agent instructions
docs/               ← Comprehensive docs
packages/*/README   ← Package documentation
```

### When Stuck
1. Read project README
2. Search codebase for similar patterns
3. Check package READMEs
4. Look at recent commits
5. Ask user for clarification

---

## 🎓 Learning Path

### Day 1: Understanding
- [ ] Read project README
- [ ] Explore directory structure
- [ ] Check available packages
- [ ] Read DEV-RULES.md

### Week 1: Contributing
- [ ] Make first small contribution
- [ ] Follow commit conventions
- [ ] Update documentation
- [ ] Learn project patterns

### Month 1: Proficiency
- [ ] Understand architecture
- [ ] Know package purposes
- [ ] Can work independently
- [ ] Suggest improvements

---

## ✅ Success Criteria

**You're doing well when:**
- ✅ Your code follows project patterns
- ✅ No one asks "why did you do it this way?"
- ✅ Your commits are clear and detailed
- ✅ You update docs as you go
- ✅ You reuse existing code
- ✅ TypeScript/ESLint are happy
- ✅ Tests pass
- ✅ Code is readable

**You need to improve when:**
- ❌ Creating duplicate functionality
- ❌ Hardcoding values
- ❌ Ignoring TypeScript errors
- ❌ Vague commit messages
- ❌ No documentation updates
- ❌ Using raw HTML elements
- ❌ Breaking changes without discussion

---

## 🔄 Continuous Improvement

This guide evolves. When you:
- Learn a better pattern → Update this guide
- Make a mistake → Add a warning
- Discover a gotcha → Document it

**Version:** 1.0.0
**Last Updated:** 2025-11-05
**License:** MIT

---

## 📞 Need Help?

1. Check project README
2. Read CLAUDE.md or dev docs
3. Search codebase
4. Check git history
5. Ask user

**Remember:** Most questions are already answered in the codebase!
