# Backlog — EZBill

**Status :** `in-progress` | **Priorité :** haute | **Dernière mise à jour :** 2026-03-28

## Audit 2026-03-28 — 85% production-ready

## Étapes
1. [ ] CRITIQUE: Replace all alert() with toast (sonner) — ~30 instances
2. [ ] CRITIQUE: Remove all console.log/console.error from production code
3. [ ] CRITIQUE: Replace deprecated getUserId() with useAuth().user._id everywhere
4. [ ] CRITIQUE: Implement Quote PDF or hide the button
5. [ ] CRITIQUE: Fix `: any` return types on dashboard pages
6. [ ] Standardize API responses — all endpoints return { data, pagination }
7. [ ] Add client search/filter on dashboard
8. [ ] i18n — translate all hardcoded English strings
9. [ ] Remove legacy files (clients.old.ts, invoices.old.ts, v2 components)
10. [ ] Add empty states on client detail + settings deleted items
11. [ ] Mobile UX — test table views, modals on small screens
12. [ ] Quote expiration dates + reminders
13. [ ] Partial payments support
14. [ ] Email sending for invoices

## Notes
<!-- Contexte important -->
