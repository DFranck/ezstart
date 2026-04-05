# Backlog — EZBill

**Status :** `in-progress` | **Priorite :** haute | **Derniere mise a jour :** 2026-04-06

## Audit: 2026-04-06

## Audit complet 2026-03-29

---

## P0 — Critical (before launch)

- [x] Quote PDF generation is not implemented — `generateQuotePdfUrl()` returns null, download shows "not implemented" toast, preview modal shows nothing for quotes
- [ ] i18n: Quote modal has massive i18n gaps — labels "Client _", "Bill on behalf of", "Currency", "Valid Until", "Add Taxes", "Tax Rate (%)", "Billing Type _", "Itemized", "Flat Rate", "Description", "Qty", "Price", "Quote Summary", "Subtotal:", "Total:", "Add Line Item", "Notes", "Terms & Conditions" are all hardcoded English
- [ ] i18n: Mark-paid modal is entirely un-i18n'd — "Mark Invoice as Paid", "This will create a receipt...", "Bill on behalf of", "Personal (your name)", "Payment Date", "Notes", "Cancel", "Mark as Paid", "Marking invoice as paid...", "Invoice marked as paid and receipt created", "Failed to mark invoice as paid" all hardcoded
- [ ] i18n: Delete quote dialog has hardcoded English: "Delete Quote" and description text
- [x] Hardcoded locale `'fr'` passed to groupInvoicesByMonth/Week, groupQuotesByMonth, groupReceiptsByMonth in client dashboard — should use current locale from next-intl
- [ ] Security: Add per-user rate limiting on /api/ai/extract-invoice-data (AI costs money)
- [ ] Feature: Stripe/PayPal checkout integration — generate payment links for invoices
- [ ] Feature: Email sending — send invoices/quotes via email (Resend or @ezstart/email-service)

## P1 — High (essential for pro)

- [x] No client search/filter on main dashboard — users with many clients have no way to find one quickly
- [ ] Feature: Client portal — unauthenticated invoice view + payment flow via public link
- [ ] Feature: Onboarding wizard — guided setup (company -> payment method -> first invoice)
- [ ] Fix: Quote modal form is not reset when re-opened — state persists from previous edit (unlike invoice-modal which has useEffect reset)
- [ ] Fix: No confirmation dialog for quote accept/decline — clicking Accept or Decline immediately fires API call with no confirmation
- [ ] Fix: Share modal's "Copy Link" copies blob URL which is only valid in current tab/session — useless for sharing
- [ ] UX: Wire client search input on dashboard (skeleton exists but not hooked)
- [ ] UX: No invoice delete action — invoices can only be deleted via settings trash, no delete button on InvoiceCard (unlike QuoteCard which has one)
- [ ] UX: Date range filtering on client dashboard
- [x] No due date display on invoice cards — due date is critical info but not shown in the card view
- [ ] No overdue invoice detection — no visual indicator when an invoice is past due date
- [ ] PDF preview only works for invoices and receipts — quotes show a "click refresh" state that does nothing useful
- [ ] v2 landing page has placeholder "Dashboard Screenshot" instead of actual image
- [ ] v2 landing page has hardcoded "BEST VALUE", "Challenge", "Solution" strings not using i18n
- [ ] Feature: CSV/Excel export for invoices and clients
- [ ] Code: Delete dead components (status-change-modal, login-section, v1 cards, CombinedRevenueChart, useUserStore, cleanup-old-auth)
- [ ] Admin dashboard: DataTable-based admin panel (replicate ezauth pattern, then add to ezstart admin hub)
- [ ] `billing-permissions.ts` is duplicated between web and API (`web/src/utils/` and `api/src/utils/`) — logic drift risk (web version has `canDecline` alias, API does not)

## P2 — Medium (professional polish)

- [ ] Code: Remove 5 remaining `any` types in web code: `extractItems(response: any)` in settings, `doc?: any` and `openPreview(..., doc: any)` in client page, `cleanData: any` in payment-method-modal, `updateLineItem(... value: any)` in quote-modal
- [ ] Code: Refactor quote-modal.tsx (542-647 lines -> extract FormFields, ItemsTable, Summary)
- [ ] Code: Client dashboard page (627 lines) is too large — extract invoice/quote/receipt sections into sub-components
- [ ] Code: Payment method modal (514 lines) could be split — extract bank transfer fields, crypto fields into sub-components
- [ ] Code: Consolidate useInvoicePDF.ts and use-generate-pdf.tsx into one hook
- [ ] Code: Fix duplicate billing-permissions.ts (API vs web) — should be shared package or moved to `@ezbill/types`
- [ ] Code: Invoice modal form data initialization is duplicated — same 15-field object constructed twice (lines 59-80 and 90-113)
- [ ] Code: Legacy v1 card components still exist: `ClientCard.tsx`, `CompanyCard.tsx`, `PaymentMethodCard.tsx` — unused since dashboard uses `_v2` versions
- [ ] Code: `protected-version-switch.tsx` and `v2/page.tsx` suggest a version toggle — if v2 is now the default, remove v1 remnants
- [ ] UX: Invoice number format customization (e.g., FACTURE-2025-001)
- [ ] UX: Multi-currency revenue aggregation in charts
- [ ] UX: Bulk actions (select multiple invoices for delete/export/status change)
- [ ] UX: Empty state illustrations
- [ ] UX: Mobile action button overflow fix
- [ ] API `findWithQuery` applies `limit=20` default but web fetches ALL data at once (no pagination in billing-provider) — frontend loads everything, pagination is effectively unused

## P3 — Nice to have (post-launch)

- [ ] Feature: Recurring invoices with cron scheduling
- [ ] Feature: Invoice templates (save/load)
- [ ] Feature: Analytics dashboard (MRR/ARR)
- [ ] Feature: Partial payments tracking
- [ ] Feature: Credit notes / refund tracking
- [ ] Feature: Tax profiles (save common tax rates)
- [ ] Feature: Keyboard shortcuts
- [ ] Feature: Payment reminders — automated email/notification when invoice is approaching or past due date
- [ ] Feature: Quote expiration reminders — notify when quotes are about to expire
- [ ] Feature: Duplicate invoice/quote — one-click duplicate to create similar documents quickly
- [ ] Feature: Multi-user/team — invite team members to manage billing for a company
- [ ] Feature: Dashboard date range picker — filter all stats/charts by custom date range
- [ ] Feature: Client statements — generate account statements showing all transactions for a client
- [ ] Feature: Expense tracking — track business expenses alongside revenue for profit/loss view
- [ ] Feature: Document attachments — attach files (contracts, receipts) to invoices/quotes
- [ ] No animations/transitions when switching between group-by modes (month/week/status)
- [ ] Toast messages for invoice/quote CRUD use separate keys (creating/created/createFailed) — could use a pattern with interpolation
- [ ] `create-test-user.ts` in API root has ~30 console.log calls — should use logger or be moved to a scripts/ folder
- [ ] No character limit validation on notes/terms/description fields (client-side or server-side)
- [ ] Testing: E2E tests for invoice/quote/receipt flows
- [ ] Testing: API endpoint tests (target 60%+ coverage)
- [ ] Testing: No service layer tests (business logic like markAsPaid, convertQuoteToInvoice)
- [ ] Testing: No web component tests (modals, forms, billing permissions)
- [ ] Testing: No test for exchange rate cron job
- [ ] Testing: No test for document number generation (race conditions)

## Notes

- alert() calls have been fully eliminated (was listed in previous audit)
- console.log usage is clean in production code (only in create-test-user.ts script)
- getUserId() deprecation does not appear in current code — already fixed
- i18n is well-implemented for dashboard/settings but NOT for quote-modal, mark-paid-modal, and DocumentCard
- API has proper pagination infrastructure (findWithQueryPaginated) but frontend loads all data at once via billing-provider
- Soft delete + restore + hard delete flow is well-implemented across all entities
- AI assistant for invoice creation is functional and uses conversation history
- PDF generation is client-side (react-pdf) which is good for privacy but means no server-side PDF for email sending
