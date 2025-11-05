# 🚀 Copy This to New Projects

> **Minimal AI agent instructions** - Paste this at the root of any new project to ensure consistent AI behavior.

---

## File to Create: `.claude-instructions.md`

Copy the content below into a file named `.claude-instructions.md` at your project root:

````markdown
# AI Agent Instructions

## Core Rules (MANDATORY)

### 1. UI Components
❌ **NEVER** use raw HTML: `<div>`, `<button>`, `<input>`, `<h1>`
✅ **ALWAYS** use component library components

### 2. Colors
❌ **NEVER** hardcode: `bg-gray-100`, `text-red-500`
✅ **ALWAYS** use semantic: `bg-card`, `text-foreground`

### 3. Search Before Creating
✅ **ALWAYS** check if functionality exists in packages/shared code
✅ Use `grep -r "pattern" .` or `glob "**/*name*"` to search

### 4. TypeScript Strict
❌ **NEVER** use `any`, `@ts-ignore`
✅ **ALWAYS** run `pnpm typecheck` before committing

### 5. Clear Commits
Format: `type(scope): description`

```bash
feat(auth): add login form with validation
fix(api): prevent race condition in token refresh
docs(readme): update installation instructions
```

### 6. Update Docs
✅ Update README when modifying packages
✅ Update main docs when adding patterns
✅ Add comments for complex logic

## Before Every Task

1. [ ] Read project README
2. [ ] Check if similar code exists
3. [ ] Understand existing patterns
4. [ ] Search recent commits for context

## Quality Checks

Before committing:
- [ ] `pnpm typecheck` passes
- [ ] Code follows existing patterns
- [ ] Documentation updated
- [ ] Commit message clear

## Common Patterns

### API Calls
```typescript
import { callApi, parseApiError } from '@/utils/api'

const res = await callApi<Data>('/endpoint', { method: 'POST', body })
if (!res.ok) throw new Error(parseApiError(res.data))
```

### React Query
```typescript
const userId = getUserId()
return useQuery({
  queryKey: ['data'],
  queryFn: async () => {
    const res = await callApi('/data', { userId })
    if (!res.ok) throw new Error(parseApiError(res.data))
    return res.data
  },
  enabled: !!userId, // Only run when ready
})
```

## When to Ask User

**ALWAYS ask before:**
- Breaking changes
- Changing architecture
- Adding dependencies
- Removing features

**DON'T ask for:**
- Following patterns
- Fixing bugs
- Adding docs
- Writing tests

## Success Criteria

✅ Code follows project patterns
✅ No TypeScript errors
✅ Documentation updated
✅ Clear commit messages
✅ Reuses existing code
````

---

## Quick Setup

```bash
# 1. Copy this file to new project root
cp .claude/COPY-TO-NEW-PROJECTS.md ../new-project/

# 2. Create .claude-instructions.md
cd ../new-project
# Copy the content from above into .claude-instructions.md

# 3. AI agents will now follow these rules automatically!
```

---

## What This Ensures

✅ **Consistency** - Same patterns across all projects
✅ **Quality** - TypeScript strict, no shortcuts
✅ **Documentation** - Always up-to-date
✅ **Best Practices** - Component usage, semantic colors
✅ **Clear History** - Good commit messages

---

## Customization

**Adapt these sections for your project:**

1. **Component library name** - Change `@project/ui` to your actual package
2. **API patterns** - Add your specific API utilities
3. **Build commands** - Update `pnpm` commands if different
4. **Semantic classes** - List your actual semantic class names

---

## Additional Files (Optional)

### For Larger Projects

Create `.claude/` directory with:
- `README.md` - Extended instructions
- `AGENT-RULES.md` - Detailed rules
- `PROJECT-CONTEXT.md` - Architecture overview
- `templates/` - Commit, PR templates

### For Monorepos

Add to root:
- `CLAUDE.md` - Full dev guide (like @ezstart)
- `DEV-RULES.md` - Non-negotiable rules
- `docs/` - Comprehensive documentation

---

## Testing

After setting up, test with simple task:

```bash
claude "Create a new button component following project standards"
```

AI should:
1. Search for existing button component
2. Use semantic colors
3. Add TypeScript types
4. Update README
5. Write clear commit

---

**Version:** 1.0.0
**Created:** 2025-11-05
**Source:** @ezstart monorepo best practices
