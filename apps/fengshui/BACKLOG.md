# Backlog — FengShui

**Status :** `maintained` | **Derniere mise a jour :** 2026-04-06

## Objectif

Application web Feng Shui : analyse Bagua avec upload de plan, orientation boussole, etoiles volantes annuelles, generation PDF et systeme premium/donation.

---

## Audit: 2026-04-06

## Audit — Resume (2026-03-29)

### Etat actuel

L'app fonctionne end-to-end : upload plan, orientation boussole (drag), analyse 9 secteurs (roue/grille), PDF 2 pages, systeme premium (EZPay), donation (EZPay), i18n 3 langues (fr/en/es), dark mode, responsive. Le code est globalement propre mais comporte du dead code, des strings hardcodees, et des fonctionnalites stub/placeholder.

---

## P0 — Must Fix Before Launch

- [ ] Fix: Remove dead code — `handleDirectPDFDownload` in AnalysisStep.tsx (l70-103), `InfoSection` in BaguaOrientationsGrid.tsx (l388-418), obsolete JSON files (bagua.2025.fr.stars.json, bagua.fr.base.json, etoiles-volantes-2026.json), `BaguaSectorCard.tsx`, `fengshui-data.ts`
- [ ] Fix: Extract 7 hardcoded strings to i18n messages — `pdf-preview.tsx` (3 French strings), `BaguaOrientationsGrid.tsx` ("Element : "), `BaguaPreviewModal.tsx` ("Analyse Feng Shui Bagua"), `AuthCallbackPage` (2 English strings), `client-layout.tsx` ("Made with ... serenity")
- [ ] Fix: SVG dark mode — BaguaWheel text uses hardcoded `fill="black"` (invisible in dark mode)
- [ ] Fix: File upload validation — add max 10MB size limit + MIME type check
- [ ] Fix: Remove unused dependencies (html2canvas, @react-pdf/renderer) — pdf-generator.ts uses dom-to-image + jspdf instead

## P1 — Quality Polish

- [ ] Fix: Replace 3 `as any` casts with proper types (`loadBaguaConfig.ts` l60: `{} as any`, `AnalysisStep.tsx` l50/l54: `{} as any` for sectorRefs)
- [ ] Fix: PDF generation performance — replace 3s hardcoded delay (`setTimeout(resolve, 3000)`) with readiness check
- [ ] Fix: Add error toasts for failed operations (config loading error leaves UI stuck with no message)
- [ ] Fix: Make SEO metadata dynamic (year in keywords, title) — `layout.tsx` has hardcoded "2026", `page.tsx` l36 has `sessionStorage.getItem('lunar-popup-2026-seen')`
- [ ] Fix: PDF dark mode — PDF forces `#ffffff` background but `isDarkMode` passed to PdfCaptureContainers affects text colors — PDF should always render in light mode
- [ ] Fix: PDF scrollbar hack — `pdf-generator.ts` injects a global style to hide scrollbars during generation (fragile)
- [ ] UX: Keyboard support for compass (arrow keys +/-5 degrees)
- [ ] UX: Remove commented rotation controls in CardinalPointsStep-v2.tsx (40 lines of commented buttons, l170-210)
- [ ] UX: Reset rotation button — `resetRotation()` exists in CardinalWheel but not exposed in UI
- [ ] UX: PDF upload accepts PDFs but uses `/api/pdf-preview` (route doesn't exist in web-only app) — disable PDF upload or implement rendering
- [ ] UX: Crop with pixel sliders is too technical — simplify with presets (A4, square, free)
- [ ] UX: Stepper cast — `AnalyzePage` l101-108 does `as unknown as Array<...>` for steps — fix typing
- [ ] Admin dashboard: DataTable-based admin panel (replicate pattern, add to ezstart admin hub)

## P2 — UX Enhancements

- [ ] Feature: Local data persistence (localStorage for in-progress analysis — plan + bearing + preferences)
- [ ] Feature: Analysis history (thumbnails + metadata in localStorage, cloud for premium users)
- [ ] Feature: Export/import JSON configs
- [ ] Feature: Elements education page + interactive tooltips (5 elements, cycles productif/destructeur/affaiblissant)
- [ ] Feature: Enhanced PDF (multi-sector detail pages, premium remedies, element cycles, room recommendations)
- [ ] Feature: PDF branding — logo, brand colors, watermark for free version
- [ ] Code: Refactor PlanUploader (543L) — extract CropEditor into separate component
- [ ] Code: Refactor pdf-capture-containers (489L) — factorize card rendering between wheel/grid modes
- [ ] Code: Refactor BaguaOrientationsGrid (435L)
- [ ] Code: Extract page.tsx homepage sections (564L) into HeroSection, BenefitsSection, ComparisonTable, CTASection, LunarPopup
- [ ] UX: Accessibility — ARIA labels on SVG, focus management in modals
- [ ] UX: Compass badge contrast in dark mode
- [ ] UX: Bearing display during drag — show degree in real-time
- [ ] UX: Snap-to-45 mode for compass precision
- [ ] SEO: Use i18n messages for layout.tsx title/description per locale
- [ ] SEO: Verify robots.ts and sitemap.ts coverage for localized routes

## P3 — Advanced Features (post-launch)

- [ ] Feature: Multiple floor plans (multi-etages with same bearing + side-by-side comparison)
- [ ] Feature: Room-level recommendations (mark rooms on plan, cross with Bagua sector)
- [ ] Feature: AI-powered design suggestions (mood boards, ai-sdk image generation for premium)
- [ ] Feature: Share analysis via URL (base64 encoded link + social sharing with OG image)
- [ ] Testing: Unit tests for loadBaguaConfig, usePremium + E2E for stepper flow

---

## Notes

- **Stack** : Next.js 15, next-intl, Zustand (unused?), react-easy-crop, dom-to-image + jsPDF, EZPay/EZAuth SDKs
- **Pages** : `/` (landing), `/analyze` (stepper 3 etapes), `/donate` (+ success/cancel), `/auth/callback`
- **Premium** : etoiles volantes verrouillees derriere un paywall (oneshot 4.99, monthly 2.99, yearly 19.99) — verifie via `usePremium` qui query EZPay
- **Donnees Bagua** : separees en base (permanente) + stars (annuelle) dans les messages i18n, combinees au runtime par `loadBaguaConfigFromMessages`
- **3 langues** : fr, en, es — messages de taille similaire (~394 lignes chacun)
- **Pas d'API propre** : app web-only, utilise EZAuth API + EZPay API via SDKs
