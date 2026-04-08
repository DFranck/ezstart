# Backlog — GreenPulse

**Status :** `active` | **Derniere mise a jour :** 2026-04-08

## Objectif

AI-powered ESG & energy resilience platform with chat assistant (GP.A), workspace/project management, blockchain-verified credentials, and admin panel. Targeting SMEs in Southeast Asia navigating the convergence of the 2026 energy crisis, Vietnam ETS compliance, and EU export requirements.

---

## Audit: 2026-04-06

## Audit Summary (2026-04-06)

Full audit of green-pulse web + API + strategic feature alignment with April 2026 market context (Hormuz crisis, Vietnam Decree 29/2026 ETS, NDAChain/Digital Technology Law, EU CBAM).

---

## P0 — Critical / Security

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

### GP-005: Auth middleware missing on form config CRUD routes (Audit 2026-04-06)

- **Status:** `planned`
- **Problem:** Form config create/list/getById routes have no auth middleware. Any unauthenticated user can create or list form templates.
- **Files:** `api/src/routes/forms/configs/`

### GP-006: Remove waitlist/RequireRole — open chat to all authenticated users

- **Status:** `in-progress`
- **Action:** Remove RequireRole wrapper AND BetaAccessRequest component entirely. Quicksignup replaces the old waitlist flow — any authenticated user accesses chat directly. Remove dead waitlist code from chat/page.tsx.
- **Files:** `web/src/app/[locale]/chat/page.tsx`
- **Note:** Waitlist system fully deprecated. Quicksignup handles onboarding transparently.

### GP-042: Theme routes missing auth (**Elevated to P0** per Audit 2026-04-06)

- **Status:** `planned`
- **Problem:** `updateTheme.ts` has `// TODO: Get userId from auth middleware` comment. Theme CRUD is unprotected. `deleteTheme` also has a TODO for auth.
- **Files:** `api/src/routes/theme/`

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
- **Note:** i18n is critical for Vietnam/ASEAN deployment. Vietnamese language support is a Plan 1 requirement for rural SME access.

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
- **Note:** Mobile-first is a core requirement — 60% of target SMEs are in rural areas using phones.

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

### GP-043: Chat v1 and v2 both active — redundancy

- **Status:** `planned`
- **Problem:** Both `/api/chat` and `/api/chat-v2` are mounted and do essentially the same thing (chat with AI, save to conversation). Should consolidate into one.
- **Files:** `api/src/routes/chat/`, `api/src/routes/chat-v2.ts`

### GP-044: Waitlist admin TODO incomplete

- **Status:** `planned`
- **Problem:** `WaitlistManagement.tsx` line 95: `// TODO: If user exists, remove beta-tester role`. Role removal on rejection not implemented.
- **Files:** `web/src/app/[locale]/(views)/admin/components/WaitlistManagement.tsx`

### GP-046: Conversations & messages pagination (frontend)

- **Status:** `planned`
- **Problem:** API already supports pagination (`limit/offset/meta`) but frontend loads all conversations at once (max 20) and all messages in a single fetch. Need: (1) paginated/infinite scroll for conversation list, (2) paginated message loading per conversation (oldest first, load more on scroll up). Both via React Query with proper cache keys.
- **Files:** `web/src/hooks/useConversations.ts`, `web/src/components/lia/LiaThread.tsx`

### GP-045: ESG extract_esg feature disabled

- **Status:** `planned`
- **Problem:** `extract_esg` is hardcoded to `false` in `chat/page.tsx`. Related prompt types ('extraction') are unused. Comment in `PromptsManagement.tsx`: "extract_esg is hardcoded to false". Feature is half-built.
- **Files:** `web/src/app/[locale]/chat/page.tsx`, `api/src/services/prompt.service.ts`
- **Note:** Re-enabling extract_esg is a prerequisite for Plan 2 ESG data collection (Scope 1/2/3 structuration).

---

## P2 — Feature Gaps (Existing)

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
- **Note:** Export is a Plan 2 core requirement (PDF/Word/Excel for ESG reports).

### GP-053: No multi-language forms

- **Status:** `planned`
- **Description:** Form configs have no i18n support. Field labels, descriptions, help texts are single-language only.
- **Note:** Vietnamese + English minimum for BIDV pilot. Multi-language is essential for ASEAN expansion.

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
- **Note:** Photo upload with tags is a Plan 2 requirement for field data collection (machines, equipment, energy meters).

### GP-058: No vocal mode implementation

- **Status:** `planned`
- **Description:** Form creation dialog offers "Vocal Mode" option but there is no Web Speech API integration. Only chat mode works.
- **Note:** Voice input is a Plan 1/2 requirement for rural SME accessibility and field use.

### GP-059: No ESG dashboard

- **Status:** `planned`
- **Description:** ESG routes exist (create project, push activity data, generate report) but there is no web UI for ESG features. The dashboard page only shows workspaces.
- **Note:** This is the single biggest gap between current state and Plan 2 MVP. Blocker for BIDV pilot.

### GP-070: Admin dashboard DataTable (Audit 2026-04-06)

- **Status:** `planned`
- **Description:** DataTable-based admin panel (replicate ezauth pattern, then add to ezstart admin hub).

---

## P2 — NEW: Strategic Features (April 2026 Context)

> These features respond to the convergence of: (1) Hormuz crisis / energy price shock, (2) Vietnam ETS Decree 29/2026 going live, (3) NDAChain / Digital Technology Law, (4) EU CBAM effective 2026. They are organized by plan tier alignment.

### GP-100: Energy vulnerability quick audit — Plan 1 (Awareness)

- **Status:** `planned`
- **Priority:** HIGH — immediate market hook
- **Description:** Conversational energy cost impact assessment within GP.A chat. The AI guides the user through a quick energy vulnerability diagnostic: energy sources, % of costs, supplier dependency, backup options. No structured data saved (Plan 1 stateless), but generates a conversational summary with a hook to Plan 2.
- **Rationale:** With gasoline +50% and diesel +70% since Feb 2026 in Vietnam, the entry question for SME CEOs is no longer "What is ESG?" but "How much is this crisis costing me?" This becomes the new Plan 1 acquisition funnel.
- **Prompt engineering:** New system prompt for GP.A that combines ESG education with energy resilience assessment. Replace generic ESG suggestions with crisis-relevant opening: "How is the current energy situation affecting your business?"
- **Files to update:** `api/src/routes/chat/sendMessage.ts` (suggestions), prompt templates, `LiaThread.tsx` (welcome message)
- **Dependencies:** GP-024 (hardcoded suggestions), GP-020 (i18n for Vietnamese)

### GP-101: Energy intensity mapping module — Plan 2 (Casual)

- **Status:** `planned`
- **Priority:** HIGH — BIDV pilot differentiator
- **Description:** Structured energy consumption tracking integrated into Plan 2 ESG data collection. Captures: energy sources (grid, diesel generator, solar, LPG), consumption volumes (kWh, liters, m3), cost per unit, % of total OPEX. Calculates energy intensity ratio (energy cost / revenue or energy / unit produced). Tracks month-over-month evolution. Generates energy cost reduction roadmap via AI.
- **Data model:** Extends existing ESG Scope 1/2 data structure with energy-specific fields: `energySource`, `consumptionVolume`, `unitCost`, `backupSource`, `intensityRatio`, `costAsPercentOfOpex`.
- **UX:** New dashboard widget showing energy cost trend, intensity ratio, and AI-generated reduction opportunities. Blurred preview visible from Plan 1 as upsell hook.
- **Files:** New module under `api/src/routes/esg/energy/`, new dashboard component, extends form configs
- **Dependencies:** GP-059 (ESG dashboard), GP-041 (webhook handlers)

### GP-102: ETS supply chain exposure assessment — Plan 2 (Casual)

- **Status:** `planned`
- **Priority:** HIGH — market timing with Decree 29/2026
- **Description:** Tool to assess whether an SME is in the supply chain of the 110 facilities (34 thermal plants, 25 steel, 51 cement) currently under Vietnam ETS quotas. User inputs their client/supplier list, industry sector, and export destinations. AI cross-references against ETS-covered sectors and EU CBAM product categories (iron, steel, aluminium, cement, fertiliser). Outputs: exposure risk score, affected relationships, compliance timeline, recommended actions.
- **Rationale:** The 110 directly regulated facilities will cascade compliance requirements down to their SME suppliers. These SMEs need to understand and demonstrate their emissions profile to maintain contracts. This is the "compliance pull" that drives Plan 2 adoption.
- **Data model:** New `etsExposure` schema: `clientSectors[]`, `exportDestinations[]`, `etsOverlapScore`, `cbamExposureLevel`, `complianceDeadlines[]`.
- **UX:** Wizard-style form (3-5 steps) with AI-assisted sector classification. Results page with risk heatmap and action timeline.
- **Files:** New route `api/src/routes/esg/ets-exposure/`, new form config, new dashboard widget
- **Dependencies:** GP-057 (form field types — needs select/dropdown for sectors), GP-052 (export for sharing results with banking partners)

### GP-103: Green loan eligibility scoring — Plan 2/3 (Casual/Pro)

- **Status:** `planned`
- **Priority:** HIGH — core BIDV value proposition
- **Description:** Automated assessment of SME readiness for green credit products based on SBV (State Bank of Vietnam) green credit guidelines. Evaluates: ESG data completeness, energy efficiency trajectory, sector alignment with green taxonomy, documentation readiness. Outputs: eligibility score (0-100), gap list, improvement roadmap, estimated timeline to eligibility.
- **Plan 2:** Self-service scoring with recommendations. Exportable summary PDF.
- **Plan 3:** White-label version for BIDV with pre-filled loan application data, direct calendar booking with loan officers, portfolio-level scoring dashboard for bank staff.
- **Rationale:** Banks can't lend green without ESG documentation. This feature closes the loop between SME preparation and actual financing. Direct value prop for BIDV pilot.
- **Data model:** `greenLoanScore` schema: `overallScore`, `dataCompletenessScore`, `energyEfficiencyScore`, `sectorAlignmentScore`, `documentationReadinessScore`, `gaps[]`, `improvementActions[]`, `estimatedTimeToEligibility`.
- **Files:** New service `api/src/services/greenLoanScoring.service.ts`, new route, new dashboard component
- **Dependencies:** GP-101 (energy data), GP-059 (ESG dashboard), GP-052 (PDF export)

### GP-104: Blockchain credential verification layer — Plan 3 (Pro)

- **Status:** `planned`
- **Priority:** MEDIUM — V2 roadmap, architecture decisions needed now
- **Description:** Verifiable ESG credentials using blockchain hash verification. Architecture: GreenPulse acts as digital notary — custodial wallet signs transactions on behalf of SMEs. Only data hash + metadata stored on-chain, actual sensitive business data stays in GreenPulse sovereign database. NDAChain-compatible architecture (W3C DID, permissioned blockchain).
- **Scope V1 (Plan 3 Pro):**
  - Hash ESG report snapshots on-chain at key milestones (baseline, quarterly, annual)
  - Generate verifiable credential URL (timestamped, tamper-proof)
  - Credential shareable with banking partners, auditors, export compliance
  - Custodial wallet: SME never touches crypto — GreenPulse signs on their behalf
- **Architecture principle:** "Privacy by default, transparency by choice" — sensitive data stays sovereign, blockchain used only for verification.
- **Legal:** GreenPulse positioned as digital notary, not data guarantor. Contractual framework needed (GP-105).
- **Tech considerations:**
  - NDAChain uses Proof-of-Authority + Zero-Knowledge Proof
  - Compatible with W3C DID and GS1 standards
  - Vietnam Digital Technology Law (Jan 1, 2026) provides legal recognition
  - Transaction fees strategy: batch hashing to minimize costs
- **Files:** New service `api/src/services/blockchain.service.ts`, new types in `types/src/credential.ts`, new API routes `api/src/routes/credentials/`
- **Dependencies:** GP-059 (ESG dashboard — data to hash), Plan 3 multi-site architecture

### GP-105: Credential legal framework & terms of service — Plan 3

- **Status:** `planned`
- **Priority:** MEDIUM — parallel track with GP-104
- **Description:** Legal framework positioning GreenPulse as digital notary for ESG credentials, not as data guarantor. Covers: custodial wallet terms, liability scope, data sovereignty guarantees, credential validity period, dispute resolution. Must align with Vietnam Digital Technology Law provisions.
- **Deliverable:** ToS addendum for Plan 3 users, credential issuance terms, data processing agreement template for banking partners.
- **Dependencies:** Legal counsel review needed
- **Tag:** NOT CODE — Legal counsel task

### GP-106: EU CBAM export readiness check — Plan 2 (Casual)

- **Status:** `planned`
- **Priority:** HIGH — affects 50,000 export-oriented Vietnamese SMEs
- **Description:** Assessment tool for SMEs exporting to EU markets. Checks product categories against CBAM scope (iron, steel, aluminium, cement, fertiliser, electricity, hydrogen). Evaluates documentation readiness for CBAM reporting. Identifies CSRD-related requirements cascading from EU buyers. Generates 6-month compliance action plan.
- **UX:** Step-by-step wizard: export products -> destination markets -> current documentation -> gap analysis -> action plan.
- **Files:** New route `api/src/routes/esg/cbam-check/`, new form config
- **Dependencies:** GP-057 (form field types), GP-052 (export)

### GP-107: Carbon credit readiness module — Plan 3 (Pro)

- **Status:** `planned`
- **Priority:** LOW — relevant once ETS trading starts on Hanoi Exchange
- **Description:** For SMEs generating verifiable emission reductions, assess eligibility for carbon credit generation under Vietnam ETS offset mechanisms (up to 30% of compliance obligations can be met with credits). Tracks: baseline emissions, verified reductions, methodology alignment (CDM, JCM, Article 6.4). Generates pre-application documentation.
- **Rationale:** Vietnam ETS allows 30% offset via carbon credits. SMEs that demonstrably reduce emissions could monetize these reductions. This is a V2/V3 revenue opportunity and positions GreenPulse in the carbon market ecosystem.
- **Dependencies:** GP-104 (blockchain verification of reductions), GP-101 (energy data), GP-102 (ETS exposure)

### GP-108: BIDV white-label branding engine — Plan 3 (Pro)

- **Status:** `planned`
- **Priority:** HIGH — BIDV pilot requirement
- **Description:** White-label configuration system allowing banking partners to deploy GreenPulse under their brand. Covers: logo/colors/typography swap, custom domain support, partner-specific prompt templates, co-branded reports, restricted user packages (e.g., 1000 SME accounts/year included in institutional subscription).
- **UX for bank staff:** Portfolio ESG health dashboard, client segmentation ("Green Loan Ready" score >70 / "High Risk" score <40), pipeline forecasting.
- **Files:** Extends existing theme system (`api/src/routes/theme/`), new partner config schema
- **Dependencies:** GP-042 (theme auth — P0), GP-103 (green loan scoring), GP-059 (ESG dashboard)

---

## P2 — Feature Gaps (Existing, continued)

### GP-071: Unit + integration + E2E tests (Audit 2026-04-06)

- **Status:** `planned`
- **Description:** 0 test files currently. Need unit tests for services, integration tests for API routes, E2E tests for form filling and chat flows.

---

## P3 — Tech Debt

### GP-060: Duplicate AI services

- **Status:** `planned`
- **Problem:** `gemini.service.ts` (207 lines), `openai.service.ts` (200 lines), `lia.service.ts` (174 lines) have overlapping functionality. Should use `@ezstart/ai-sdk` UnifiedChat exclusively.
- **Files:** `api/src/services/`

### GP-061: RequireRole commented out on chat page

- **Status:** `moved -> GP-006 (P0)`
- **Note:** Elevated to P0 per security audit. See GP-006.

### GP-062: Providers route missing response schema

- **Status:** `planned`
- **Problem:** `providers.ts` has `// responseSchema: TODO: Add proper schema for AI provider list`.
- **Files:** `api/src/routes/providers.ts`

### GP-063: formExtractor.service.ts largest service (297 lines)

- **Status:** `planned`
- **Problem:** Single file handles form config loading, AI prompt construction, response parsing, field extraction, and confidence scoring. Should be split.
- **Files:** `api/src/services/formExtractor.service.ts`

---

## P0 — URGENT: Earth Day Conference (17 April 2026)

> **Deadline: 17 April 2026** — "Sustainable Future 10 & Earth Day Vietnam 2026" organized by GLC (Ngan / Green Leaders Community) at HCMUSTA, HCMC. Amber will NOT be physically present. Presence via: projected slide with QR code + printed roll-up/A2 banner with Amber's photo. Public: Vietnamese SME owners + ESG experts. Language: Vietnamese primary, English secondary.
>
> **Strategic value:** First direct B2B client acquisition opportunity. Audience = SME leaders looking for green finance access = exact GreenPulse target. Hong Quan (ICED/VNU) is guest of honor = organic reconnection opportunity via Ngan.

### GP-200: Conference landing page `/earthday` — DEADLINE 14 April

- **Status:** `done` (2026-04-08) — page exists, translated en/fr/vi, quicksignup integrated
- **Priority:** CRITICAL — 11 days
- **Description:** Dedicated mobile-first landing page at `www.ai-greenpulse.com/earthday` (or `/greenfinance`). Accessible via QR code scan from phones during the conference.
- **Language:** Vietnamese primary, English toggle.
- **Content (top to bottom):**
  - [ ] GreenPulse logo + event co-branding line: "Doi tac cong nghe tai Sustainable Future 10 & Earth Day 2026"
  - [ ] Hero message (VN): "Doanh nghiep cua ban san sang tiep can tai chinh xanh chua?" / (EN): "Is your business ready for green finance?"
  - [ ] 3 value props with icons: (a) Danh gia ESG mien phi bang AI / Free AI-powered ESG assessment, (b) Lo trinh tiep can tin dung xanh / Green loan readiness roadmap, (c) Bao cao ESG tu dong / Automated ESG reporting
  - [ ] Registration form: Ho ten / Full name, Email, Ten doanh nghiep / Company name, Nganh / Sector (dropdown: Manufacturing, F&B, Agriculture, Retail, Services, Other), So dien thoai / Phone (optional)
  - [ ] Promo code field: pre-filled with `EARTHDAY2026`, label: "Ma uu dai — 1 thang mien phi goi Pro khi ra mat" / "Promo code — 1 free month of Pro when we launch"
  - [ ] CTA button: "Bat dau mien phi voi GP.A ->" linking to `/chat`
  - [ ] Footer: Amber's mini bio (photo + 2 lines) + GreenPulse contact + GLC/Earth Day event credit
- **Tech requirements:**
  - Mobile-first responsive (phones will scan QR)
  - Fast load (<2s on 4G Vietnam)
  - Form submission stores to DB: `name`, `email`, `company`, `sector`, `phone`, `promoCode`, `source: "earthday2026"`, `createdAt`
  - Success state: "Cam on! Ban da dang ky. Hay bat dau tro chuyen voi GP.A ngay ->" with CTA to chat
  - No auth required to register (low friction)
  - Track UTM: `?utm_source=earthday&utm_medium=qrcode`
- **Files:** New page `web/src/app/[locale]/earthday/page.tsx`, new API route `api/src/routes/leads/createLead.ts`, new DB model `Lead`
- **Estimate:** 2-3 days dev
- **Dependencies:** None (standalone page)

### GP-201: ~~Promo code system~~ — CANCELLED

- **Status:** `cancelled` (2026-04-08) — replaced by quicksignup flow. Users are created directly as real accounts via quicksignup + noreply email for password change. No separate Lead model needed. PromoCode tracked on user profile if needed.

### GP-202: GP.A chat welcome message update — DEADLINE 14 April

- **Status:** `urgent`
- **Priority:** HIGH
- **Description:** Update GP.A chat welcome message and initial suggestions to be relevant for Earth Day conference attendees arriving via QR code. The current generic message ("Ask GP.A anything about sustainability") must be replaced.
- **New welcome message (VN):**
  > "Xin chao! Toi la GP.A — tro ly AI cua GreenPulse. Toi giup doanh nghiep SME danh gia muc do san sang ESG va kha nang tiep can tai chinh xanh. Ban co the hoi toi ve:
  >
  > - Chi phi nang luong va cach giam thieu
  > - Yeu cau ESG cho xuat khau sang EU
  > - Dieu kien vay tin dung xanh
  >   Hay bat dau bang cau hoi don gian: nganh nghe cua ban la gi?"
- **New welcome message (EN):**
  > "Hi! I'm GP.A — GreenPulse's AI assistant. I help SMEs assess their ESG readiness and green finance eligibility. You can ask me about:
  >
  > - Energy costs and reduction strategies
  > - ESG requirements for EU exports
  > - Green loan eligibility conditions
  >   Let's start simple: what industry is your business in?"
- **New suggestion chips:**
  - VN: "Chi phi nang luong anh huong the nao?" / "Tin dung xanh la gi?" / "Yeu cau ESG xuat khau EU"
  - EN: "How do energy costs affect me?" / "What is green credit?" / "EU export ESG requirements"
- **Files:** `web/src/components/lia/LiaThread.tsx` (welcome message + suggestions), `api/src/routes/chat/sendMessage.ts` (suggestion chips), prompt templates
- **Estimate:** 0.5 day dev
- **Dependencies:** GP-020 (i18n — ideally use `useTranslations` but hardcoded VN/EN acceptable for deadline)
- **Note:** If user arrives with `?utm_source=earthday`, could show a specific Earth Day welcome variant. Nice-to-have, not required.

### GP-203: Conference slide design — DEADLINE 15 April

- **Status:** `urgent`
- **Priority:** HIGH
- **Tag:** NOT CODE — Design task (Amber + Claude)
- **Description:** Single 16:9 slide for Ngan to project during the event. Clean, professional, brand-aligned.
- **Content:**
  - GreenPulse logo (top left)
  - Amber's professional photo (right side or bottom right)
  - QR code (large, center-prominent, links to `www.ai-greenpulse.com/earthday?utm_source=earthday&utm_medium=qrcode`)
  - Headline (VN): "Danh gia muc do san sang tai chinh xanh — Mien phi" / "Assess your green finance readiness — Free"
  - Sub (VN): "Quet ma QR -> Dang ky -> Tro chuyen voi AI" / "Scan QR -> Register -> Chat with AI"
  - Amber credential line: "Amber Seradni — CEO & Co-founder | 12+ nam chien luoc phat trien ben vung | Co van UN Women"
  - Earth Day 2026 / GLC co-branding footer
- **Format:** PowerPoint slide + PNG export for Ngan
- **Estimate:** Claude creates, Amber reviews. 1 round.

### GP-204: Conference banner/roll-up design — DEADLINE 14 April (print lead time)

- **Status:** `urgent`
- **Priority:** HIGH
- **Tag:** NOT CODE — Design task (Amber + Claude)
- **Description:** Vertical roll-up banner (85x200cm) or A2 poster for physical display at HCMUSTA venue.
- **Content (top to bottom):**
  - GreenPulse logo
  - Amber's photo (professional, approachable)
  - Headline (VN): "AI giup doanh nghiep SME tiep can tai chinh xanh"
  - QR code (large enough to scan from 1-2m distance)
  - 3 icons + short text: Danh gia ESG / Lo trinh tin dung xanh / Bao cao tu dong
  - Promo: "Quet ma -> Dang ky -> 1 thang Pro mien phi"
  - Bottom: website URL + Earth Day 2026 event credit
- **Format:** Print-ready PDF (CMYK, 300dpi, bleed marks)
- **Print timeline:** Must send to print by April 14 latest for April 17 delivery (confirm with local print shop — HCMC same-day/next-day possible for roll-ups)
- **Estimate:** Claude creates design concept, Amber validates, final in Canva or Illustrator for print-ready.

### GP-205: Conference lead tracking & follow-up system

- **Status:** `planned` — post-event
- **Priority:** MEDIUM
- **Description:** After April 17, follow-up workflow for Earth Day leads:
  - [ ] Automated welcome email (24h post-registration): "Cam on ban da dang ky tai Earth Day 2026! Ma EARTHDAY2026 da duoc luu..."
  - [ ] Week 1 post-event: check-in email with link to chat if they haven't used it
  - [ ] Admin dashboard: view all Earth Day leads, track who converted to active chat users
  - [ ] Tag system: `source: earthday2026` for all analytics
- **Files:** Email service integration (can be basic nodemailer to start), admin lead list component
- **Dependencies:** GP-200, GP-201
- **Note:** Post-event, manual follow-up acceptable for V1.

---

## Implementation Priority Matrix

> Updated 2026-04-07. Conference Sprint 0 inserted as top priority. BIDV/ICED on hold (silence radio). Focus: Earth Day acquisition -> investor demo readiness -> V1 deployment.

### Sprint 0 — Earth Day Conference (Apr 7-16, HARD DEADLINE Apr 17)

| Ticket | Description                                       | Owner        | Estimate | Deadline       |
| ------ | ------------------------------------------------- | ------------ | -------- | -------------- |
| GP-200 | Landing page `/earthday` mobile-first VN/EN       | Franck       | 2-3 days | Apr 14         |
| GP-201 | Promo code system + Lead model                    | Franck       | 1 day    | Apr 14         |
| GP-202 | GP.A welcome message update VN/EN                 | Franck       | 0.5 day  | Apr 14         |
| GP-006 | RequireRole fix on chat (users must access chat!) | Franck       | 0.5 day  | Apr 13         |
| GP-203 | Conference slide with QR                          | Amber+Claude | 1 round  | Apr 15         |
| GP-204 | Roll-up/A2 banner design                          | Amber+Claude | 1 round  | Apr 14 (print) |

**Acceptance criteria Sprint 0:**

- [ ] QR code scanned on phone -> lands on `/earthday` in <2s
- [ ] Registration form works, stores lead with `source: earthday2026` and `promoCode: EARTHDAY2026`
- [ ] After registration, user can access GP.A chat with green-finance-relevant welcome
- [ ] Slide and banner sent to Ngan / print shop by Apr 15
- [ ] Chat page accessible without auth issues (GP-006 resolved)

### Sprint 1 — Security & Post-Conference Foundation (Weeks 3-4)

| Ticket                         | Description                            | Why                                        |
| ------------------------------ | -------------------------------------- | ------------------------------------------ |
| GP-002, GP-004, GP-005, GP-042 | Remaining auth/access control fixes    | Cannot scale with open security holes      |
| GP-043                         | Consolidate chat v1/v2                 | Clean foundation before adding features    |
| GP-024 + GP-100                | Energy vulnerability prompt for Plan 1 | Convert Earth Day leads into engaged users |
| GP-205                         | Lead follow-up system                  | Nurture Earth Day contacts                 |

### Sprint 2 — Plan 2 Core: ESG Dashboard + Energy (Weeks 5-8)

| Ticket | Description                 | Why                                          |
| ------ | --------------------------- | -------------------------------------------- |
| GP-059 | ESG dashboard web UI        | Biggest gap — blocker for everything Plan 2+ |
| GP-041 | ESG webhook handlers        | Backend needed for dashboard data            |
| GP-045 | Re-enable extract_esg       | Prerequisite for structured data collection  |
| GP-101 | Energy intensity mapping    | Differentiator in energy crisis context      |
| GP-052 | Form data export (CSV, PDF) | Needed for banking partner sharing           |

### Sprint 3 — Compliance & Green Finance (Weeks 9-12)

| Ticket | Description                    | Why                                               |
| ------ | ------------------------------ | ------------------------------------------------- |
| GP-102 | ETS supply chain exposure      | Market timing with Decree 29/2026                 |
| GP-106 | EU CBAM export readiness       | Affects 50K export SMEs                           |
| GP-103 | Green loan eligibility scoring | Core BIDV value proposition (when they re-engage) |
| GP-053 | Multi-language forms (EN/VI)   | Full i18n system beyond hardcoded strings         |
| GP-057 | Additional form field types    | Needed for assessment wizards                     |

### Sprint 4 — White-label & Blockchain Prep (Weeks 13-16)

| Ticket | Description                        | Why                                    |
| ------ | ---------------------------------- | -------------------------------------- |
| GP-108 | White-label branding engine        | Banking partner deployment             |
| GP-104 | Blockchain credential architecture | V2 differentiator, NDAChain-compatible |
| GP-105 | Legal framework for credentials    | Parallel track with tech               |
| GP-058 | Vocal mode                         | Rural SME accessibility                |

### Sprint 5 — Scale & Monetization (Weeks 17+)

| Ticket | Description             | Why                                  |
| ------ | ----------------------- | ------------------------------------ |
| GP-107 | Carbon credit readiness | ETS trading launch on Hanoi Exchange |
| GP-055 | Collaboration features  | Plan 3 multi-user                    |
| GP-054 | Form versioning         | Audit trail for compliance           |
| GP-071 | Test coverage           | Pre-scaling stability                |

---

## Notes

- **Earth Day conference (17 Apr 2026) is the #1 priority.** First real B2B client acquisition event. All Sprint 0 tickets are hard-deadline. Franck should focus exclusively on GP-200/201/202/006 from Apr 7-14.
- **BIDV (Mai Chi) and ICED/VNU (Hong Quan) are on hold** — silence radio for weeks/months. Do not base short-term plan on them. However, Hong Quan is guest of honor at Earth Day -> Ngan can facilitate a soft reconnection. Amber should brief Ngan to mention GreenPulse to Hong Quan if natural.
- **Vietnamese company created** (10K EUR capital). Enables paid infrastructure. Budget remains tight (no revenue yet). Prioritize free/low-cost tools for conference (Vercel hosting, MongoDB Atlas free tier, etc.).
- **Investor deck sent** to impact investors (measurable population impact + AI). One investor specifically interested in Web3 — adapt pitch per audience, blockchain is not for all.
- **Auth is still critical** — GP-006 is in Sprint 0 because conference attendees MUST be able to access the chat after registration. Other auth fixes (GP-002, GP-004, GP-005, GP-042) move to Sprint 1.
- **i18n:** Vietnamese hardcoded strings are acceptable for Sprint 0 deadline. Proper `useTranslations` i18n system is Sprint 3 (GP-053).
- **ESG is half-built** — API endpoints exist but webhook handlers are stubs, extract_esg is disabled, and there is no web UI. GP-059 remains the single biggest blocker post-conference.
- **Test coverage is 0%** — vitest is configured but no tests written.
- **30+ @ts-expect-error** comments indicate Mongoose model typing needs a systematic fix.
- **Energy crisis context (April 2026):** Hormuz closure, Brent >$100/bbl, Vietnam gasoline +50%, diesel +70%. SME priorities shifted from "ESG as nice-to-have" to "energy resilience as survival." Chat messaging must reflect this.
- **Vietnam ETS is now live:** Decree 29/2026 + Decision 263/2026. 110 facilities under quotas. Cascade effect on SME supply chains. GP-102 is time-sensitive.
- **NDAChain + Digital Technology Law:** National blockchain infrastructure deploying 2026. GP-104 architecture should be NDAChain-compatible from the start.
- **Conference material checklist:**
  - [ ] Landing page live and tested on mobile (Apr 14)
  - [ ] QR code generated pointing to `www.ai-greenpulse.com/earthday?utm_source=earthday&utm_medium=qrcode` (Apr 14)
  - [ ] Slide sent to Ngan (Apr 15)
  - [ ] Banner sent to print shop (Apr 14) — confirm lead time with HCMC printer
  - [ ] Amber briefs Ngan on GreenPulse positioning + soft intro request to Hong Quan
  - [ ] Test full flow: scan QR -> register -> enter chat -> receive green finance welcome message
