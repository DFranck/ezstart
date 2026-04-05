# Step 2 — Code (Agent Dispatch)

## Before launching ANY coding agent

- [ ] Read `.claude/agents/coding-rules.md`
- [ ] Identify the DEV-RULES sections relevant to the task
- [ ] Define EXACT files the agent should read and modify
- [ ] Define EXPECTED output

## Agent prompt MUST contain

1. Task description (what + why)
2. Files to read first
3. Files to modify
4. These NON-NEGOTIABLE rules (copy verbatim):
   - NEVER raw HTML tags (div, p, span, table...) — use @ezstart/ui (Div, P, Span, Card, DataTable...)
   - NEVER className with Tailwind outside packages/ui — use component props/variants
   - NEVER console.log — use @ezstart/logger
   - NEVER alert()/window.confirm — use sonner toast / AlertDialog
   - NEVER useState+useEffect+fetch — use React Query
   - NEVER raw fetch/axios — use callApi wrapper
   - ALWAYS DataTable from @ezstart/ui for ALL data lists/tables
   - ALWAYS i18n next-intl t() for ALL user-facing text (FR + EN)
   - ALWAYS Zod validation on API inputs
   - ALWAYS sendSuccess/sendError for API responses
   - ALWAYS formatCurrency for amounts
   - ALWAYS @ezstart/logger for logging
5. Specific constraints for this task

## Parallel agents

- OK to launch multiple agents in parallel
- Each agent gets its OWN complete rules context
- No shared files between parallel agents
- Manager validates EACH agent output (Step 3) before committing
