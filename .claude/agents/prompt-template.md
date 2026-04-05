# Agent Prompt Template

Copy this template for EVERY coding agent. Fill in the [BLANKS].

---

## Task: [DESCRIPTION]

### Context

[WHY this task exists, what problem it solves]

### Files to read first

- [file1.ts]
- [file2.ts]

### Files to modify

- [file1.ts] — [what to change]

### NON-NEGOTIABLE RULES (violation = commit blocked by pre-commit hook)

**NEVER:**

- Raw HTML tags (div, p, span, table, button, input...) — use @ezstart/ui (Div, P, Span, Card, DataTable, Button, Input...)
- className with Tailwind outside packages/ui — use component props/variants
- console.log/warn/error — use @ezstart/logger
- alert()/window.confirm — use sonner toast / AlertDialog from @ezstart/ui
- useState+useEffect+fetch — use React Query (useQuery/useMutation)
- Raw fetch/axios — use callApi wrapper from src/config/api.ts
- Hardcoded strings in UI — use next-intl t() for ALL user-facing text
- Create components in apps/ — consume from packages/ui or packages/\*-sdk
- Hardcoded Tailwind colors (bg-gray-100) — use semantic (bg-card, text-foreground)

**ALWAYS:**

- DataTable from @ezstart/ui for ALL data lists/tables
- i18n: translations in BOTH FR + EN message files
- Zod validation on ALL API inputs
- sendSuccess/sendError for ALL API responses
- formatCurrency for ALL currency amounts
- @ezstart/logger for ALL logging
- Loading/error/empty states on ALL async content
- Consume packages/ui components, enhance packages/ui if component missing

**COMPONENT HIERARCHY:**

- packages/ui → generic components (Button, DataTable, Card, Div, P...)
- packages/\*-sdk → business components that CONSUME packages/ui (PurchaseButton, DonationWall...)
- apps/ → pages that CONSUME sdk + ui, NEVER create custom components

### Specific requirements for this task

[TASK-SPECIFIC DETAILS]
