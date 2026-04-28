# Standard SaaS Perf — Performance checklist

Source de vérité performance pour toute app SaaS @ezstart. Aligné sur Vercel / Next.js best practices et benchmarks Stripe / Linear / Vercel Dashboard. Complémentaire à `standard-saas.md` (checklist générale).

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch first paying customer (TTI > 5s = perte de 30% conversions)
- **🟠 P1 / V1** — nécessaire dans les 3 mois post-launch (scaling early)
- **🟡 P2 / V2** — devient "vraiment pro" (UX polish, optimization fine)
- **🟢 P3 / V3+** — excellence long-terme (visual regression, perf budgets enforced en CI)
- **⚡ QW** — Quick Win, < 1 jour, annotation EN PLUS de P\_

---

## 1. Rendering strategy

- [ ] 🔴 P0 ⚡QW : `packages/ui` components are Server Components by default (pas de `'use client'` sauf si interactif) (5min audit grep)
- [ ] 🔴 P0 : **Pas de `mounted` guard pattern** (`useState(false) + useEffect(setTrue) + if (!mounted) return Skeleton`) — détruit le HTML SSR et force un skeleton flash sur CHAQUE page load. Avec un AuthProvider SSR-bootstrappé via `initialUser`, le state est correct au 1er render. Exception : composants dépendants strictement d'une browser API non-SSR (commenter `// mounted guard required: <reason>`). (cf. `nextjs.md` §1.1)
- [ ] 🟠 P1 : Audit existing components — convert client → server when no interactivity needed (1-2 jours par app)
- [ ] 🟠 P1 : Streaming SSR + `<Suspense>` boundaries autour de chaque async data section (1 jour par page lourde)
- [ ] 🟡 P2 : Code splitting via `dynamic(() => import(...), { ssr: false })` pour heavy client-only components (charts, editors, modals avec deps lourdes) (1 jour par app)
- [ ] 🟡 P2 ⚡QW : Prefetch on hover par défaut (Next.js Link prefetch=true en prod, déjà le default) — vérifier qu'aucun `prefetch={false}` n'est posé sans raison (30min audit)

## 2. Bundle size

- [ ] 🟠 P1 : Bundle budget < 200KB JS initial / route (sans gzip). Mesurer via `pnpm next build` + `@next/bundle-analyzer` (1 jour setup)
- [ ] 🟠 P1 : Tree-shakable imports — jamais `import * as X` ni imports namespacés depuis lodash/date-fns (use named imports) (audit grep + fix)
- [ ] 🟡 P2 : Pas de polyfills inutiles (target ES2022+ dans tsconfig, déjà OK)
- [ ] 🟡 P2 ⚡QW : Dynamic imports pour routes admin / dashboards lourds qui ne sont pas chargés tant que l'utilisateur n'y va pas (2-4h par app)
- [ ] 🟢 P3 : Bundle size enforced en CI via `next-bundle-analyzer` + GitHub Action qui fail si delta > +10% (1 jour)

## 3. Images

- [ ] 🔴 P0 ⚡QW : `next/image` partout — `width` + `height` obligatoires (évite CLS). JAMAIS `<img>` natif (15min audit grep)
- [ ] 🔴 P0 ⚡QW : `priority` prop sur l'image LCP (above-the-fold hero image) (5min par page)
- [ ] 🔴 P0 : Format AVIF/WebP via `next/image` (auto, mais vérifier que les sources sont bien optimisables — pas de PNG géant 5MB)
- [ ] 🟠 P1 : `placeholder="blur"` + `blurDataURL` pour éviter flash blanc (1 jour pour générer les placeholders)
- [ ] 🟠 P1 : Configurer `images.remotePatterns` strictement dans `next.config.js` (pas de `domains: ['*']`) (10min)
- [ ] 🟡 P2 : SVG inline pour les icônes < 1KB (via `<Icon>` de `@ezstart/ui`)

## 4. Fonts

- [ ] 🔴 P0 ⚡QW : `next/font` avec `display: 'swap'` partout (évite FOIT — Flash Of Invisible Text) (15min audit)
- [ ] 🔴 P0 ⚡QW : Subset minimum (`subsets: ['latin']`) — pas de subset `cyrillic` si l'app n'a pas de RU (5min)
- [ ] 🟠 P1 : Self-host fonts (next/font le fait par défaut depuis 13.2 — vérifier zéro `<link href="https://fonts.googleapis.com">` natif) (audit grep)
- [ ] 🟡 P2 : Variable fonts pour réduire le nb de fichiers (1 file vs 4 weights × 2 styles)

## 5. Caching

- [ ] 🔴 P0 : Static pages cachées par défaut (Next.js le fait — vérifier que `dynamic = 'force-dynamic'` n'est pas posé sans raison) (audit grep)
- [ ] 🟠 P1 : `revalidate` sur les pages semi-statiques (pricing, landing, blog) — ISR avec stale-while-revalidate (1 jour par page)
- [ ] 🟠 P1 : `unstable_cache` / `cache()` autour des fetch DB partagés entre composants RSC (audit + fix par feature)
- [ ] 🟡 P2 : CDN headers — `Cache-Control: s-maxage=...` sur les API routes immutables (config Vercel) (30min)

## 6. Database / API perf

- [ ] 🔴 P0 : Indexes MongoDB sur tous les champs de query fréquente (user.email, applicationId, plan.priceId) (1 jour audit DB)
- [ ] 🔴 P0 : Pagination obligatoire sur TOUS les list endpoints (default limit 50, max 100) — déjà checklist `data-protection.md` (audit grep)
- [ ] 🟠 P1 : N+1 query elimination — populate / aggregate au lieu de loop fetch (audit feature par feature)
- [ ] 🟠 P1 : Connection pooling Mongoose (déjà OK via `connectToMongo`) — vérifier `maxPoolSize` (5min)
- [ ] 🟡 P2 : Slow query log activé (Atlas Performance Advisor + Mongoose `set('debug', { enabled: process.env.MONGOOSE_DEBUG === 'true' })`) (1h)
- [ ] 🟡 P2 : Read replicas pour analytics queries (si > 10K writes/jour) (1 jour setup)

## 7. Network

- [ ] 🟠 P1 ⚡QW : HTTP/2 enforced (Vercel le fait, Railway aussi — vérifier qu'on n'a pas de proxy HTTP/1.1 devant) (5min check headers)
- [ ] 🟠 P1 : Brotli compression activée (Vercel auto, Railway via `compression` middleware en api-core)
- [ ] 🟡 P2 : DNS prefetch + preconnect pour les domaines tiers (Stripe, Sentry, fonts) (15min par app)

## 8. Lighthouse / Web Vitals

- [ ] 🟠 P1 : Lighthouse CI gate — Perf 90+ / A11y 90+ / Best Practices 90+ / SEO 90+ sur toutes les routes publiques (1 jour setup, 2 jours fix initial)
- [ ] 🟠 P1 : Web Vitals tracking en production → analytics (Vercel Analytics gratuit OU custom via `useReportWebVitals`) (1h setup)
- [ ] 🔴 P0 : LCP < 2.5s (75th percentile prod)
- [ ] 🔴 P0 : CLS < 0.1 (75th percentile prod)
- [ ] 🟠 P1 : INP < 200ms (75th percentile prod) — remplacement de FID depuis 2026
- [ ] 🟡 P2 : Real User Monitoring (RUM) cross-region — visualisation par pays (1 jour)

## 9. Audit grep commands

```bash
# Detect <img> natif (interdit)
grep -rnE "<img " apps/<app>/web/src/ --include="*.tsx" --include="*.jsx"

# Detect dynamic = 'force-dynamic' sans justif (commentaire requis)
grep -rn "force-dynamic" apps/<app>/web/src/ --include="*.tsx"

# Detect 'use client' inutiles (à valider à la main — chercher composants sans onClick/useState)
grep -l "^'use client'" packages/ui/src/components/

# Detect fetch sans cache config
grep -rnE "fetch\(" apps/<app>/web/src/app/ --include="*.tsx" --include="*.ts" | grep -v "cache:"

# Detect bundle bloat — large deps
pnpm --filter web-<app> exec next build && pnpm --filter web-<app> exec npx @next/bundle-analyzer

# Mounted guard pattern (interdit sauf justif explicite — détruit SSR)
grep -rnE "useState\(false\).*mounted|setMounted\(true\)|if \(!mounted\)" packages/ apps/ --include="*.tsx"
```

## 10. Comparaison modèles pro

| Service              | LCP cible | Bundle initial | Stratégie clé                                   |
| -------------------- | --------- | -------------- | ----------------------------------------------- |
| **Stripe Dashboard** | < 1.5s    | ~150KB         | Server-rendered + island hydration              |
| **Linear**           | < 1s      | ~80KB          | Local-first SPA, sync background                |
| **Vercel Dashboard** | < 1.5s    | ~180KB         | RSC + streaming Suspense                        |
| **Clerk Dashboard**  | < 2s      | ~200KB         | RSC + dynamic imports admin features            |
| **@ezstart cible**   | < 2s (P0) | < 200KB (P1)   | RSC by default + Suspense + dynamic admin pages |

## 11. Checklist par app

Avant marquer une app "perf-ready" :

- [ ] Lighthouse 90+ sur 3 routes représentatives (landing / dashboard / admin)
- [ ] Bundle analyzer run → confirmé < 200KB initial
- [ ] Web Vitals tracked en prod
- [ ] Pas de `<img>` natif
- [ ] `next/font` partout avec swap
- [ ] Server Components majoritaires dans `packages/ui`
- [ ] Indexes DB documentés dans `<app>/api/src/models/INDEXES.md`

## Related

- `standard-saas.md` — checklist apps SaaS générale
- `standard-saas-observability.md` — RUM, Web Vitals tracking
- `mongodb.md` — connectToMongo + factory pattern
