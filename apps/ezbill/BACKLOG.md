# Backlog — EZBill

**Status :** `in-progress` | **Priorite :** haute | **Derniere mise a jour :** 2026-04-01

## Audit complet 2026-03-29

---

## Critical (bugs/regressions)

- [x] Quote PDF generation is not implemented — `generateQuotePdfUrl()` returns null, download shows "not implemented" toast, preview modal shows nothing for quotes
- [ ] Quote modal has massive i18n gaps — labels "Client _", "Bill on behalf of", "Currency", "Valid Until", "Add Taxes", "Tax Rate (%)", "Billing Type _", "Itemized", "Flat Rate", "Description", "Qty", "Price", "Quote Summary", "Subtotal:", "Total:", "Add Line Item", "Notes", "Terms & Conditions" are all hardcoded English
- [ ] Mark-paid modal is entirely un-i18n'd — "Mark Invoice as Paid", "This will create a receipt...", "Bill on behalf of", "Personal (your name)", "Payment Date", "Notes", "Cancel", "Mark as Paid", "Marking invoice as paid...", "Invoice marked as paid and receipt created", "Failed to mark invoice as paid" all hardcoded
- [ ] Delete quote dialog has hardcoded English: "Delete Quote" and description text
- [x] Hardcoded locale `'fr'` passed to groupInvoicesByMonth/Week, groupQuotesByMonth, groupReceiptsByMonth in client dashboard — should use current locale from next-intl
- [ ] `billing-permissions.ts` is duplicated between web and API (`web/src/utils/` and `api/src/utils/`) — logic drift risk (web version has `canDecline` alias, API does not)

## High Priority (UX/functionality)

- [x] No client search/filter on main dashboard — users with many clients have no way to find one quickly
- [ ] No invoice delete action — invoices can only be deleted via settings trash, no delete button on InvoiceCard (unlike QuoteCard which has one)
- [ ] No confirmation dialog for quote accept/decline — clicking Accept or Decline immediately fires API call with no confirmation
- [ ] Quote modal form is not reset when re-opened — state persists from previous edit (unlike invoice-modal which has useEffect reset)
- [ ] Share modal's "Copy Link" copies blob URL which is only valid in current tab/session — useless for sharing
- [x] No due date display on invoice cards — due date is critical info but not shown in the card view
- [ ] No overdue invoice detection — no visual indicator when an invoice is past due date
- [ ] PDF preview only works for invoices and receipts — quotes show a "click refresh" state that does nothing useful
- [ ] v2 landing page has placeholder "Dashboard Screenshot" instead of actual image
- [ ] v2 landing page has hardcoded "BEST VALUE", "Challenge", "Solution" strings not using i18n
- [ ] `status-change-modal.tsx` exists but is never imported anywhere — dead code
- [ ] `login-section.tsx` exists alongside `ezauth-login-section.tsx` — likely legacy dead code

## Medium Priority (code quality/improvements)

- [ ] Quote modal (647 lines) needs refactoring — should extract FormFields, ItemsTable, Summary sub-components like invoice-modal already did
- [ ] Client dashboard page (627 lines) is too large — extract invoice/quote/receipt sections into sub-components
- [ ] Payment method modal (514 lines) could be split — extract bank transfer fields, crypto fields into sub-components
- [ ] 5 remaining `: any` types in web code: `extractItems(response: any)` in settings, `doc?: any` and `openPreview(..., doc: any)` in client page, `cleanData: any` in payment-method-modal, `updateLineItem(... value: any)` in quote-modal
- [ ] Legacy v1 card components still exist: `ClientCard.tsx`, `CompanyCard.tsx`, `PaymentMethodCard.tsx` — unused since dashboard uses `_v2` versions, should be deleted
- [ ] `protected-version-switch.tsx` and `v2/page.tsx` suggest a version toggle — if v2 is now the default, remove v1 remnants
- [ ] `useInvoicePDF.ts` and `use-generate-pdf.tsx` — two PDF hooks coexist, consolidate into one
- [ ] Invoice modal form data initialization is duplicated — same 15-field object constructed twice (lines 59-80 and 90-113)
- [ ] `CombinedRevenueChart.tsx` (243 lines) exists but is never imported — dead code
- [ ] `useUserStore.ts` (Zustand store) exists but appears unused — billing-provider uses React Query instead
- [ ] `cleanup-old-auth.ts` utility — likely legacy from auth migration, verify if still needed
- [ ] `billing-permissions.ts` should be a shared package or moved to `@ezbill/types` to avoid web/API duplication
- [ ] API `findWithQuery` applies `limit=20` default but web fetches ALL data at once (no pagination in billing-provider) — frontend loads everything, pagination is effectively unused

## Low Priority (nice to have)

- [ ] No keyboard shortcuts — could add Ctrl+N for new invoice, Ctrl+K for search, etc.
- [ ] No bulk actions — cannot select multiple invoices/quotes to delete, export, or change status
- [ ] No date range filter on client dashboard — all invoices/quotes shown, no way to filter by period
- [ ] No search within client dashboard — cannot search invoices by number or description
- [ ] Revenue chart only shows paid invoices in USD — no multi-currency aggregation using exchange rates
- [ ] No animations/transitions when switching between group-by modes (month/week/status)
- [ ] Mobile: action buttons on document cards could overflow on small screens with many actions (invoice cards have up to 5 buttons)
- [ ] No empty state illustration/images — uses text-only empty states
- [ ] Toast messages for invoice/quote CRUD use separate keys (creating/created/createFailed) — could use a pattern with interpolation
- [ ] `create-test-user.ts` in API root has ~30 console.log calls — should use logger or be moved to a scripts/ folder
- [ ] No rate limiting on AI assistant endpoint
- [ ] No character limit validation on notes/terms/description fields (client-side or server-side)

## Feature Ideas

- [ ] **Recurring invoices** — auto-generate invoices on schedule (weekly/monthly) for retainer clients
- [ ] **Payment reminders** — automated email/notification when invoice is approaching or past due date
- [ ] **Email sending** — send invoices/quotes directly via email from the app (integrate with email service)
- [ ] **Client portal** — shareable link where clients can view/pay their invoices
- [ ] **Export options** — CSV/Excel export of invoices, revenue reports, client lists
- [ ] **Multi-currency dashboard** — aggregate revenue across currencies using stored exchange rates
- [ ] **Partial payments** — track partial payments on invoices (e.g., 50% deposit)
- [ ] **Invoice templates** — save reusable templates for common invoice types
- [ ] **Credit notes** — issue credit notes for refunds/corrections linked to original invoice
- [ ] **Quote expiration reminders** — notify when quotes are about to expire
- [ ] **Duplicate invoice/quote** — one-click duplicate to create similar documents quickly
- [ ] **Invoice numbering customization** — let users set prefix format (e.g., INV-2026-001 vs FACTURE-001)
- [ ] **Tax profiles** — save common tax rates (VAT 20%, GST 10%) for quick selection
- [ ] **Multi-user/team** — invite team members to manage billing for a company
- [ ] **Stripe/PayPal integration** — accept online payments directly from invoice link
- [ ] **Dashboard date range picker** — filter all stats/charts by custom date range
- [ ] **Client statements** — generate account statements showing all transactions for a client
- [ ] **Expense tracking** — track business expenses alongside revenue for profit/loss view
- [ ] **Document attachments** — attach files (contracts, receipts) to invoices/quotes

## Testing

- [ ] No API endpoint tests (controllers, routes, middleware)
- [ ] No service layer tests (business logic like markAsPaid, convertQuoteToInvoice)
- [ ] No web component tests (modals, forms, billing permissions)
- [ ] No E2E tests for critical flows (create invoice, mark paid, generate PDF)
- [ ] No test for exchange rate cron job
- [ ] No test for document number generation (race conditions)

## Notes

- alert() calls have been fully eliminated (was listed in previous audit)
- console.log usage is clean in production code (only in create-test-user.ts script)
- getUserId() deprecation does not appear in current code — already fixed
- i18n is well-implemented for dashboard/settings but NOT for quote-modal, mark-paid-modal, and DocumentCard
- API has proper pagination infrastructure (findWithQueryPaginated) but frontend loads all data at once via billing-provider
- Soft delete + restore + hard delete flow is well-implemented across all entities
- AI assistant for invoice creation is functional and uses conversation history
- PDF generation is client-side (react-pdf) which is good for privacy but means no server-side PDF for email sending
