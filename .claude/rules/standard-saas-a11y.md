# Standard SaaS A11y — Accessibility checklist

Source de vérité accessibilité pour toute app @ezstart. Aligné sur WCAG 2.1 AA + ARIA Authoring Practices Guide. Complémentaire à `standard-ui.md` (composants).

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch (basics keyboard + ARIA — sinon utilisateurs handicapés exclus + risque légal EU)
- **🟠 P1 / V1** — WCAG AA mandatory dans 3 mois (compliance EU `EAA` 2025 + US `ADA`)
- **🟡 P2 / V2** — devient "vraiment accessible" (screen reader testing complet, prefers-reduced-motion)
- **🟢 P3 / V3+** — excellence (AAA, voice navigation)
- **⚡ QW** — Quick Win, < 1 jour, annotation EN PLUS de P\_

---

## 1. Keyboard navigation

- [ ] 🔴 P0 ⚡QW : Tous les composants interactifs accessibles au clavier (Tab, Enter, Space) — tester chaque composant `packages/ui` (1 jour audit)
- [ ] 🔴 P0 ⚡QW : Esc ferme TOUS les modals / popups / dropdowns (déjà OK Radix-based — vérifier composants custom) (15min audit)
- [ ] 🔴 P0 ⚡QW : Tab order logique (haut→bas, gauche→droite) — pas de `tabindex > 0` sauf cas exceptionnel documenté (audit grep)
- [ ] 🔴 P0 ⚡QW : Skip link "Skip to main content" en début de body (15min — déjà partiel via `<Main>` semantic) (5min)
- [ ] 🟠 P1 : Focus trap dans les modals (Tab loop dans la modal seulement) — Radix le fait, vérifier custom modals (audit)
- [ ] 🟠 P1 : Keyboard shortcuts documentés (Cmd+K palette, Cmd+/ help) — page `/keyboard-shortcuts` ou modal (1 jour)
- [ ] 🟡 P2 : Roving tabindex pour les data tables (flèches dans grids) (3 jours)

## 2. Focus management

- [ ] 🔴 P0 ⚡QW : Focus rings visibles partout — JAMAIS `outline: none` sans alternative (audit grep `outline-none` sans `focus-visible:`) (15min)
- [ ] 🔴 P0 ⚡QW : Focus visible utilise `focus-visible:ring-ring focus-visible:ring-2` (déjà OK packages/ui via tokens — vérifier consistency) (audit)
- [ ] 🟠 P1 : Focus auto sur le 1er input quand modal s'ouvre (Radix le fait via autofocus — vérifier)
- [ ] 🟠 P1 : Focus restored au trigger après fermeture modal (Radix le fait)
- [ ] 🟡 P2 : Focus indicator >= 3px épais et 3:1 contrast (WCAG AA 2.4.13) (1 jour audit + fix tokens)

## 3. ARIA

- [ ] 🔴 P0 ⚡QW : `aria-label` sur TOUS les icon-only buttons (audit grep `<Button>` sans children string) (1-2h)
- [ ] 🔴 P0 ⚡QW : `aria-label` sur les icônes décoratives ou `aria-hidden="true"` (15min audit)
- [ ] 🔴 P0 : Form labels associés via `<Label htmlFor="...">` ou `aria-labelledby` (audit grep `<Input>` sans `<Label>` proche)
- [ ] 🟠 P1 ⚡QW : Form errors associated via `aria-describedby` + `aria-invalid="true"` (1-2h pattern dans `<FormField>`)
- [ ] 🟠 P1 : Live regions (`aria-live="polite"` ou `assertive`) pour les toasts (sonner le fait par défaut, vérifier)
- [ ] 🟠 P1 : Loading states announced — `aria-busy="true"` + `<Skeleton>` avec `role="status"` + sr-only text (1 jour pattern)
- [ ] 🟡 P2 : `aria-current="page"` sur le link nav actif (15min audit)
- [ ] 🟡 P2 : Landmarks structure — `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` (déjà OK via `<Tag />` semantic)

## 4. Color & contrast

- [ ] 🟠 P1 : Color contrast 4.5:1 minimum (WCAG AA) — text vs background (audit via Lighthouse + axe DevTools) (1-2 jours fix tokens)
- [ ] 🟠 P1 : 3:1 contrast pour large text (>= 18pt ou 14pt bold) et UI components (boutons, icônes)
- [ ] 🔴 P0 ⚡QW : Color N'EST PAS le seul moyen d'information — un statut error a aussi une icône / label (audit visuel) (2-4h)
- [ ] 🟡 P2 : Test high-contrast mode (Windows ContrastMedia) — ne pas casser (1 jour audit)
- [ ] 🟡 P2 : Color blindness simulator (Sim Daltonism / Lighthouse) — vérifier protanopia/deuteranopia/tritanopia (1 jour)

## 5. Motion & animations

- [ ] 🟡 P2 ⚡QW : `prefers-reduced-motion` respecté — désactiver animations non-essentielles (1-2h Tailwind plugin + audit) (`@media (prefers-reduced-motion: reduce) { ... }`)
- [ ] 🟡 P2 : Pas d'auto-play vidéo / carousel (sauf opt-in)
- [ ] 🟢 P3 : Pas de flash > 3 fois/seconde (WCAG 2.3.1 — anti-épilepsie)

## 6. Screen reader testing

- [ ] 🟡 P2 : Test NVDA (Windows) ou VoiceOver (Mac) sur les flows critiques (login, signup, checkout, dashboard) (3-5 jours par app)
- [ ] 🟡 P2 : Test annonces de toast / errors / loading
- [ ] 🟢 P3 : JAWS testing (entreprise) si target B2B grandes orgs

## 7. Forms

- [ ] 🔴 P0 ⚡QW : Tous les inputs ont un `<Label>` visible — pas juste placeholder (déjà rule UI mais audit) (1h)
- [ ] 🔴 P0 ⚡QW : Required fields marqués (`*` + `aria-required="true"`) (15min audit)
- [ ] 🟠 P1 : Erreurs server-side annoncées (live region) + scroll to first error (1 jour pattern)
- [ ] 🟠 P1 : Autocomplete attributes (`autocomplete="email"`, `"current-password"`, etc.) (1h audit)
- [ ] 🟡 P2 : Inline validation non-blocante (debounced, message clair, pas de submit disable précoce) (2 jours)

## 8. Documents / structure

- [ ] 🔴 P0 ⚡QW : `<html lang="...">` correct par locale (déjà OK via [locale] routing) (5min check)
- [ ] 🔴 P0 ⚡QW : Heading hierarchy logique (H1 → H2 → H3, pas de saut H1 → H4) (1h audit par page)
- [ ] 🟠 P1 : Page title unique et descriptif (déjà OK via Next.js metadata)
- [ ] 🟡 P2 : Breadcrumbs avec `aria-label="breadcrumb"` (15min)

## 9. Tools / CI

- [ ] 🟠 P1 : `eslint-plugin-jsx-a11y` recommended preset activé dans `@ezstart/eslint-config/next-js` (1h setup)
- [ ] 🟠 P1 : axe DevTools manual pass sur chaque feature avant merge (changement workflow)
- [ ] 🟡 P2 : Lighthouse a11y CI gate >= 95 (1 jour)
- [ ] 🟡 P2 : Pa11y CI sur sitemap + comparaison snapshot (2 jours)
- [ ] 🟢 P3 : Audit manuel WCAG complet par expert externe annuel ($3-10K)

## 10. Audit grep commands

```bash
# outline:none sans focus-visible alternative
grep -rnE "outline-none|outline:\s*none" apps/ packages/ --include="*.tsx" --include="*.css" | grep -v "focus-visible"

# Buttons sans aria-label ni text content (icon-only suspects)
grep -rnE "<Button[^>]*>\s*<Icon" apps/ packages/ --include="*.tsx" | grep -v "aria-label"

# Inputs sans Label associé (heuristique, à vérifier visuellement)
grep -rnE "<Input " apps/ packages/ --include="*.tsx" | head -20

# tabindex > 0 (interdit sauf justif)
grep -rnE "tabIndex=\{?[1-9]" apps/ packages/ --include="*.tsx"

# alt manquant sur img / Image (si <img> trouvé interdit déjà standard-saas-perf)
grep -rnE "<Image " apps/ --include="*.tsx" | grep -v "alt="

# autocomplete sur form fields
grep -rnE "<Input[^>]*type=\"(email|password|tel|text)\"" apps/ --include="*.tsx" | grep -v "autoComplete"
```

## 11. Comparaison modèles pro

| Service              | A11y maturity                                     | Score Lighthouse |
| -------------------- | ------------------------------------------------- | ---------------- |
| **Stripe Dashboard** | WCAG 2.1 AA + AAA partial + audit annuel externe  | 95+              |
| **Linear**           | WCAG 2.1 AA + keyboard-first + screen reader full | 95+              |
| **Vercel Dashboard** | WCAG 2.1 AA + axe CI                              | 90+              |
| **GitHub**           | WCAG 2.1 AA + dedicated a11y team                 | 90+              |
| **@ezstart cible**   | WCAG 2.1 AA (P1) + jsx-a11y CI (P1)               | 90+ (P1)         |

## 12. Checklist par app avant launch

- [ ] Keyboard nav testé (Tab cycle complet sans souris)
- [ ] Esc ferme tous les overlays
- [ ] Focus rings visibles partout
- [ ] Tous les icon buttons ont aria-label
- [ ] Heading hierarchy validée (axe / Lighthouse)
- [ ] Color contrast 4.5:1 validé (axe / Lighthouse)
- [ ] Form errors annoncées correctement
- [ ] eslint-plugin-jsx-a11y actif
- [ ] Lighthouse a11y >= 90

## 13. Resources

- WCAG 2.1 quickref : https://www.w3.org/WAI/WCAG21/quickref/
- ARIA Authoring Practices : https://www.w3.org/WAI/ARIA/apg/
- axe DevTools : https://www.deque.com/axe/devtools/
- European Accessibility Act 2025 : https://ec.europa.eu/social/main.jsp?catId=1202

## Related

- `standard-ui.md` — composants accessibles by default
- `ui.md` — focus rings, semantic colors
- `standard-saas-perf.md` — Lighthouse CI gates
