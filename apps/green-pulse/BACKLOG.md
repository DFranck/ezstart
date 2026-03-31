# Backlog — GreenPulse

**Status :** `active` | **Derniere mise a jour :** 2026-03-29

## Objectif

AI-powered forms application with chat assistant (Lia/GP.A), workspace/project management, ESG integration, and admin panel.

---

## Audit Summary (2026-03-29)

Full audit of green-pulse web + API. Findings organized by priority.

---

## P0 — Critical / Security

### GP-001: Auth missing on projects, forms, conversations, chat, ESG routes (→ monorepo #59)

- **Status:** `planned`
- **Problem:** Only `/workspaces` routes use `authMiddleware`. All other route groups (projects, forms, conversations, chat, ESG, prompts, theme, upload) have NO authentication middleware.
  - `/api/projects` — no auth, `userId` comes from query param (trivially spoofable)
  - `/api/forms/*` — no auth at all (anyone can create/read/delete form configs and instances)
  - `/api/conversations` — no auth (anyone can list/read/delete any user's conversations)
  - `/api/chat` — no auth (userId from request body)
  - `/api/esg/*` — no auth
  - `/api/prompts` — no auth (admin-only CRUD exposed publicly)
  - `/api/theme` — no auth
  - `/api/upload` — no auth
- **Fix:** Add `authMiddleware` to all route groups. Use `req.userId` from JWT instead of query/body params. Admin routes need role-based middleware.
- **Files:** `api/src/routes/*/index.ts`

### GP-002: Project access control commented out

- **Status:** `planned`
- **Problem:** `getProjectById.ts` has access control check commented out (`// const { userId } = req.query`, `// const hasAccess = ...`). Any user can access any project by ID.
- **Files:** `api/src/routes/projects/getProjectById.ts`

### GP-003: Form config CRUD incomplete — no update/delete endpoints

- **Status:** `planned`
- **Problem:** Form configs only have create, list, getById. Missing PUT/PATCH and DELETE. Admin cannot edit or remove form templates.
- **Files:** `api/src/routes/forms/configs/`

### GP-004: Prompts admin panel publicly accessible

- **Status:** `planned`
- **Problem:** `/api/prompts` CRUD (create, update, delete system prompts) has no auth. The web admin panel at `/(views)/admin` also needs server-side role check.
- **Files:** `api/src/routes/prompts/index.ts`, `web/src/app/[locale]/(views)/admin/`

---

## P1 — Code Quality / Type Safety

### GP-010: 39 remaining `any` types across 16 files

- **Status:** `planned`
- **Key offenders:**
  - `web/src/hooks/useConversations.ts` — `callApi<any>` (x2)
  - `web/src/components/forms/FormChatInterface.tsx` — `Record<string, any>` (x3)
  - `web/src/components/forms/FormFillingInterface.tsx` — `Record<string, any>` (x2)
  - `web/src/components/forms/FormPreview.tsx` — `Record<string, any>` (x2)
  - `api/src/services/gemini.service.ts` — `Promise<any>` return
  - `api/src/services/openai.service.ts` — `Promise<any>` return
  - `api/src/services/formExtractor.service.ts` — 6 occurrences
  - `types/src/api.ts` — 5 occurrences
  - `types/src/formInstance.ts` — 7 occurrences
  - `types/src/chat.ts` — 3 occurrences
  - `web/src/app/[locale]/page.tsx` — `(): any` return type
  - `web/src/app/[locale]/(views)/admin/components/PromptConfigEditor.tsx` — `any` cast

### GP-011: 30+ `@ts-expect-error` across API routes (→ monorepo #64)

- **Status:** `planned`
- **Problem:** Almost every Mongoose call has `// @ts-expect-error - Mongoose type inference issue`. These should be fixed with proper Mongoose model typing or use the `express-core` model factory pattern.
- **Files:** Most files in `api/src/routes/`

### GP-012: 0 unit tests (→ monorepo #73)

- **Status:** `planned`
- **Problem:** `vitest.config.ts` exists but there are zero test files (`.test.ts` or `.spec.ts`) in the entire app.
- **Priority tests needed:** form extraction service, chat message handling, workspace access control logic.

### GP-013: Stale/temporary files at root

- **Status:** `planned`
- **Files to clean:**
  - `web/NEW_SECTIONS.tsx` — empty file (0 lines)
  - `web/waitlist.json` — 4-line JSON, should not be in source
  - `api/test-openai.mjs` — 41-line test script, should be in `api/src/scripts/` or removed

---

## P1 — i18n / Hardcoded Strings

### GP-020: Hardcoded English strings in LiaThread component

- **Status:** `planned`
- **Problem:** `LiaThread.tsx` (483 lines) has multiple hardcoded strings not using `useTranslations`:
  - `"LIA is thinking"` (line 449)
  - `"Welcome to GP.A"` (line 464)
  - `"Your AI assistant for sustainability and ESG reporting"` (line 465)
  - `"Ask GP.A anything about sustainability..."` (line 459)
  - `locale === 'fr' ? 'Selectionner un modele' : 'Select a model'` — inline translation instead of i18n (line 417)
- **Files:** `web/src/components/lia/LiaThread.tsx`

### GP-021: Hardcoded English strings in FormChatInterface

- **Status:** `planned`
- **Problem:** `FormChatInterface.tsx` has hardcoded strings:
  - `"Hello! I'm here to help you fill out this form..."` (line 33-34)
  - `"Thanks! I've extracted that information. Anything else?"` (line 88)
  - `"Sorry, I had trouble processing that..."` (line 106)
  - `"Still need: ..."` (line 98)
  - `"Analyzing and extracting..."` (line 153)
  - `"Send"` button (line 178)
  - `"Type your message..."` placeholder (line 170-173)
  - `"Form submitted - no more editing"` (line 172)
- **Files:** `web/src/components/forms/FormChatInterface.tsx`

### GP-022: Hardcoded strings in FormPreview

- **Status:** `planned`
- **Strings:** `"Form Preview"`, `"fields filled"`, `"confident"`, `"All fields filled!"`, `"Enter {label}"`.
- **Files:** `web/src/components/forms/FormPreview.tsx`

### GP-023: Hardcoded strings in FormFillingInterface

- **Status:** `planned`
- **Strings:** `"Form not found"`, `"Submit Form"`, `"Submitting..."`, `window.confirm("Submit this form?...")`.
- **Files:** `web/src/components/forms/FormFillingInterface.tsx`

### GP-024: Hardcoded English in chat suggestions (API)

- **Status:** `planned`
- **Problem:** `sendMessage.ts` and `chat-v2.ts` return hardcoded English suggestions: `"Tell me about your energy usage"`, `"Review extracted data"`, etc.
- **Files:** `api/src/routes/chat/sendMessage.ts`, `api/src/routes/chat-v2.ts`

---

## P1 — UX Issues

### GP-030: Chat streaming not fully integrated

- **Status:** `planned`
- **Problem:** Web config requests `stream: true` but the API `sendMessage.ts` does not implement SSE streaming — it returns a single JSON response. The `enableStreaming: true` in the web config auto-detects, but there is no actual incremental streaming from the API.
- **Files:** `api/src/routes/chat/sendMessage.ts`, `web/src/app/[locale]/chat/page.tsx`

### GP-031: Large components need decomposition

- **Status:** `planned`
- **Components exceeding 300 lines:**
  - `PromptsManagement.tsx` — 545 lines
  - `LiaThread.tsx` — 483 lines
  - `PromptConfigEditor.tsx` — 424 lines
  - `chat/page.tsx` — 381 lines (BetaAccessRequest should be its own component)
  - `careers/page.tsx` — 370 lines
  - `features-section.tsx` — 342 lines
  - `WaitlistManagement.tsx` — 304 lines

### GP-032: Mock AI model selector in LiaThread

- **Status:** `planned`
- **Problem:** `MOCK_AI_MODELS` is hardcoded in `LiaThread.tsx` with `enabled: false` for all models except Gemini Flash. The real `AISelector` from `@ezstart/ai-sdk/client` is also rendered in the composer. Two model selectors displayed simultaneously.
- **Files:** `web/src/components/lia/LiaThread.tsx`

### GP-033: Form filling responsive design basic

- **Status:** `planned`
- **Problem:** Split-screen (chat + preview) uses `lg:` breakpoint for side-by-side, stacking vertically on mobile. But the fixed `h-screen` layout may cause scroll issues on mobile. No medium-screen optimization.
- **Files:** `web/src/components/forms/FormFillingInterface.tsx`

### GP-034: `window.confirm` for form submission

- **Status:** `planned`
- **Problem:** `FormFillingInterface.tsx` uses native `window.confirm()` for submit confirmation. Should use a proper dialog component from `@ezstart/ui`.
- **Files:** `web/src/components/forms/FormFillingInterface.tsx`

### GP-035: Dark mode minimal in form components

- **Status:** `planned`
- **Problem:** Only 2 `dark:` class usages across all form/lia components. The chat page landing uses `dark:hidden/dark:block` for logo swap, but form components rely entirely on CSS variables with no dark-specific overrides.

### GP-036: Conversation unread logic not implemented

- **Status:** `planned`
- **Problem:** `listConversations.ts` returns `unread: false` with a `// TODO: Implement unread logic` comment.
- **Files:** `api/src/routes/conversations/listConversations.ts`

---

## P2 — API Quality

### GP-040: ESG routes have no pagination

- **Status:** `planned`
- **Problem:** All ESG endpoints lack pagination. Also no Zod validation on some ESG routes.
- **Files:** `api/src/routes/esg/`

### GP-041: ESG webhook handlers are stubs

- **Status:** `planned`
- **Problem:** `handleEsgReport.ts` (134 lines) has 4 TODO comments: "Save to database", "Send email notification", "Send failure notification", "Update dashboard with processed metrics". Core webhook logic is not implemented.
- **Files:** `api/src/routes/webhooks/handleEsgReport.ts`

### GP-042: Theme routes missing auth

- **Status:** `planned`
- **Problem:** `updateTheme.ts` has `// TODO: Get userId from auth middleware` comment. Theme CRUD is unprotected.
- **Files:** `api/src/routes/theme/`

### GP-043: Chat v1 and v2 both active — redundancy

- **Status:** `planned`
- **Problem:** Both `/api/chat` and `/api/chat-v2` are mounted and do essentially the same thing (chat with AI, save to conversation). Should consolidate into one.
- **Files:** `api/src/routes/chat/`, `api/src/routes/chat-v2.ts`

### GP-044: Waitlist admin TODO incomplete

- **Status:** `planned`
- **Problem:** `WaitlistManagement.tsx` line 95: `// TODO: If user exists, remove beta-tester role`. Role removal on rejection not implemented.
- **Files:** `web/src/app/[locale]/(views)/admin/components/WaitlistManagement.tsx`

### GP-045: ESG extract_esg feature disabled

- **Status:** `planned`
- **Problem:** `extract_esg` is hardcoded to `false` in `chat/page.tsx`. Related prompt types ('extraction') are unused. Comment in `PromptsManagement.tsx`: "extract_esg is hardcoded to false". Feature is half-built.
- **Files:** `web/src/app/[locale]/chat/page.tsx`, `api/src/services/prompt.service.ts`

### GP-046: listWorkspaces missing pagination metadata in response (→ monorepo #76)

- **Status:** `planned`
- **Problem:** `listWorkspaces.ts` uses `skip/limit` but returns `sendSuccess(res, { workspaces, total })` without `limit`/`offset` in pagination metadata. Other list endpoints (conversations, projects, forms) correctly use `sendSuccess(res, data, { total, limit, offset })`.
- **Files:** `api/src/routes/workspaces/listWorkspaces.ts`

---

## P2 — Feature Gaps

### GP-050: No form templates system

- **Status:** `planned`
- **Description:** Form configs are seeded via `seedForms.ts` but there is no UI for admin to create/edit/delete form templates. The `createFormConfig` endpoint exists but has no admin UI.
- **Needed:** Admin panel section for form config management (CRUD UI).

### GP-051: No form analytics/insights

- **Status:** `planned`
- **Description:** No dashboard showing form completion rates, average fill time, field-level completion stats, or AI extraction accuracy metrics.

### GP-052: No form data export (CSV, PDF)

- **Status:** `planned`
- **Description:** No way to export filled form instances. Users cannot download their submitted data.

### GP-053: No multi-language forms

- **Status:** `planned`
- **Description:** Form configs have no i18n support. Field labels, descriptions, help texts are single-language only.

### GP-054: No form versioning

- **Status:** `planned`
- **Description:** Form configs have no version tracking. Editing a config affects all existing instances retroactively. No history of changes.

### GP-055: No collaboration features

- **Status:** `planned`
- **Description:** Workspace/project members exist in the model but there is no invite UI, no real-time collaboration on forms, no activity feed, no notifications.

### GP-056: No AI model selection per conversation

- **Status:** `planned`
- **Description:** Mock model selector in UI, but all requests go through the same backend provider. No per-conversation model persistence.

### GP-057: No form field types beyond text/number

- **Status:** `planned`
- **Description:** `FormPreview.tsx` only renders `<Input type="text|number">`. No support for: select/dropdown, date picker, file upload, textarea, checkbox, radio, rich text.

### GP-058: No vocal mode implementation

- **Status:** `planned`
- **Description:** Form creation dialog offers "Vocal Mode" option but there is no Web Speech API integration. Only chat mode works.

### GP-059: No ESG dashboard

- **Status:** `planned`
- **Description:** ESG routes exist (create project, push activity data, generate report) but there is no web UI for ESG features. The dashboard page only shows workspaces.

---

## P3 — Tech Debt

### GP-060: Duplicate AI services

- **Status:** `planned`
- **Problem:** `gemini.service.ts` (207 lines), `openai.service.ts` (200 lines), `lia.service.ts` (174 lines) have overlapping functionality. Should use `@ezstart/ai-sdk` UnifiedChat exclusively.
- **Files:** `api/src/services/`

### GP-061: RequireRole commented out on chat page

- **Status:** `planned`
- **Problem:** `chat/page.tsx` has `RequireRole` wrapper commented out, meaning any authenticated user can access the chat regardless of role. The `BetaAccessRequest` component is dead code.
- **Files:** `web/src/app/[locale]/chat/page.tsx`

### GP-062: Providers route missing response schema

- **Status:** `planned`
- **Problem:** `providers.ts` has `// responseSchema: TODO: Add proper schema for AI provider list`.
- **Files:** `api/src/routes/providers.ts`

### GP-063: formExtractor.service.ts largest service (297 lines)

- **Status:** `planned`
- **Problem:** Single file handles form config loading, AI prompt construction, response parsing, field extraction, and confidence scoring. Should be split.
- **Files:** `api/src/services/formExtractor.service.ts`

---

## Notes

- **Auth is the top priority** — most routes are completely unprotected.
- **i18n pass was done** for structured pages but form components and chat components still have many hardcoded English strings.
- **ESG is half-built** — API endpoints exist but webhook handlers are stubs, extract_esg is disabled, and there is no web UI.
- **Test coverage is 0%** — vitest is configured but no tests written.
- **30+ @ts-expect-error** comments indicate Mongoose model typing needs a systematic fix.
