# Backlog — Gacha Analyzer

**Status :** `in-progress` | **Priorite :** haute | **Derniere mise a jour :** 2026-03-29

## Objectif

App pour scanner et analyser des screenshots de jeux (Summoners War runes, Nikke Goddess of Victory gear, etc.) via OCR scripte + fallback IA optionnel.

## Architecture decidee

```
packages/
└── ocr-sdk/                  <- Package reutilisable
    ├── src/
    │   ├── index.ts
    │   ├── engines/          <- Tesseract, etc.
    │   ├── parsers/          <- Regex parsers par jeu
    │   └── types.ts
    └── README.md

apps/
└── gacha-analyzer/
    ├── web/                  <- Next.js, tous les providers standard
    ├── api/                  <- Express, @ezstart/express-core
    └── types/                <- Types partages web+api (Rune, Gear, Scan, etc.)
```

## Decisions prises

- OCR scripte (Tesseract + regex) = chemin principal (~100ms)
- IA vision = fallback optionnel pour cas edge (~2-3s)
- `packages/ocr-sdk/` car potentiellement reutilisable ailleurs
- Respecte toutes les regles monorepo (voir DEV-RULES.md)
- Providers standard : NextIntl + ThemeProvider + AuthProvider + ErrorBoundary + Toaster
- Ports a reserver dans `@ezstart/config` urls.ts

---

## Historique (done)

<details>
<summary>90 etapes completees (cliquer pour voir)</summary>

1. [x] Rediger plan detaille (taches par agent)
2. [x] Nettoyer refs obsoletes port 5080 -> 5000
3. [x] Ajouter ports 5080/5085 dans `@ezstart/config`
4. [x] Creer `packages/ocr-sdk/` — moteur OCR + types + helpers
5. [x] Creer `apps/gacha-analyzer/types/` — Rune, Gear, Scan, Game
6. [x] Creer `apps/gacha-analyzer/api/` — Express + routes action-based + multer
7. [x] Parser Summoners War (runes) — 16 tests
8. [x] Parser Nikke (gear) — 8 tests
9. [x] Creer `apps/gacha-analyzer/web/` — Next.js mobile-first
10. [x] Client layout avec nav, auth, i18n
11. [x] Engine efficacite Barion — 15 tests
12. [x] Screen capture + frame diff + ROI selector draggable
13. [x] Fix fetch-client FormData, turbo stream mode, dev scripts cross-platform
14. [x] Pipeline end-to-end : capture -> crop ROI -> OCR Tesseract -> affichage rawText
15. [x] Parser robuste (hardcoded main stats, fuzzy matching, multiline, validation ranges)
16. [x] Synergy scoring (5 archetypes, gem/roll awareness)
17. [x] Profile selector par jeu (early/mid/late) avec seuils + level strictness
18. [x] Zoomed ROI preview (drag + scroll zoom, resolution native)
19. [x] Image preprocessing (grayscale + contrast + binarize)
20. [x] Bouton rescan manuel
21. [x] Fix efficacite Barion (0-100%, tier display, set bonus)
22. [x] Bench mode — 3 sources x 8 presets x zones individuelles = 24 OCR runs
23. [x] 8 zones de lecture (setSlot, mainStat, quality, innate, sub1-4)
24. [x] Masques rouges (bench) / marron (scan) pour cacher les boutons UI
25. [x] Dual preview (tabs zoom/full) avec lock toggle
26. [x] Layouts nommes en DB (rune-manager, power-up, etc.)
27. [x] Import 1001 monstres SWARFARM avec suggestions par archetype
28. [x] Theme SW CSS variables (OKLCH, roll quality, tiers, elements)
29. [x] Profil joueur envoye a l'API
30. [x] 14 build archetypes avec gem/roll awareness
31. [x] Artifact types + parser (33 substats, 10 tests)
32. [x] Mode unifie zoom+ROI (full window + zoom + drag ROI)
33. [x] Upload mode supprime — capture only
34. [x] UX pass : settings collapsibles, compact RuneCard, gaming homepage
35. [x] Game banners SVG + rune set icons SWARFARM
36. [x] Interactions separees : left=ROI, middle=pan, Ctrl+scroll=zoom
37. [x] 3 rune card templates (compact/detailed/gaming) avec selecteur
38. [x] Skeletons permanents pour tous les templates
39. [x] Roll breakdown par substat avec badges qualite SW
40. [x] Roll Quality separe (current vs post-gem)
41. [x] Gem/grind recommendations par archetype avec icones
42. [x] Set affinity — archetypes priorises par coherence du set
43. [x] Flash background base sur le conseil (sell=rouge, upgrade=bleu, keep=vert)
44. [x] Cache image hash — pas de rescan duplique
45. [x] Conseil progressif considere le potentiel
46. [x] Toutes couleurs via CSS variables (theme GA + globals)
47. [x] Advice simplifie — "UP UPGRADE — 65% to keep"
48. [x] Page /data avec 11 sections de reference + tooltips
49. [x] SET_STAT_TIERS per set + setWeightedEfficiency dans le scoring
50. [x] Innate scoring (S=-20, A=-12, B=0, C=+5, D=-5)
51. [x] Low-roll penalty S/A tier + non-grindable penalty
52. [x] SET_STRENGTH (consensus communautaire S/A/B/C/D)
53. [x] Gem logic 100% set-based (plus archetype-based)
54. [x] Archetypes retires du scoring principal (info secondaire)
55. [x] Rune card compact : badge simplifie + breakdown score +/-
56. [x] Page /data mergee 14->10 sections, sprites rune sets, tableau unifie
57. [x] Page /sources creee (APIs, wikis, outils, GitHub)
58. [x] Home : images de fond par jeu + logos PNG (plus d'emojis)
59. [x] Banner decoratif avec H1 overlay sur les pages jeu
60. [x] UX scan : bouton parametres a cote de capture, settings en dessous
61. [x] Scripts dev:x clean .next automatiquement (rimraf)
62. [x] Architecture multi-game : images/[game]/, config/games/[game].ts
63. [x] Theme CSS splite : common + summoners-war + nikke
64. [x] Assets Nikke : 12 icons (manufacturers, gear types, rarities)
65. [x] Halo lumineux sur logos de jeu (drop-shadow)
66. [x] Banner margin dynamique (ResizeObserver sur header)
67. [x] Charts package UI — Recharts + DataTable installes, /data refactore avec radar chart + DataTables
68. [x] DataTable package UI — @tanstack/react-table + sort/filter/pagination, utilise dans /data
69. [x] Refacto OCR SDK — parsers/analyzers dans gacha-analyzer/api, SDK 100% agnostique
70. [x] Ancient runes — detection "A" OCR, ranges in-game verifies (HP% 6-10), base vs roll separe, badge Ancient
71. [x] Hot reload API — tsx watch < NUL (fix Windows/turbo PTY bug)
72. [x] Scoring fixes — quality/mismatch penalty, potential set-weighted, seuils resserres, low-roll avg-based
73. [x] UI card compact — value/max total, powerup rolls individuels, breakdown score, gem breakdown
74. [x] Gem logic v2 — rolls protegent massivement (+0.4/powerup), gem la stat avec least rolls + low tier
75. [x] Gem/Grind sprites — gem+set overlay, grind+set, ban icon non-grindable, tooltips ranges
76. [x] Main stat tier scoring — factor multiplicateur (S=1.0, B=0.8, C=0.6) pour slots 2/4/6
77. [x] Resume narratif — "Pourquoi SELL/UPGRADE?" avec check/cross + gem/grind reco, toujours visible
78. [x] Debug panel expandable — flow complet colore (gris/vert/rouge), 3 profils cote a cote
79. [x] History page fix — \_id->id mapping, confidence display, scan cards avec set/slot/advice badge
80. [x] Scan detail fix — memory:// image fallback, confidence x100 fix
81. [x] Re-analyser — endpoint API + bouton pour re-parser avec nouveau code
82. [x] Scan feedback — agree/disagree + commentaire, filtre history, badge scan card
83. [x] Estimation rolls — parser (aX%) hints du rawText, 6 tests, rollHints dans RuneData
84. [x] OpenAPI/Swagger — 15 operations documentees, /docs expose sur localhost:5080/docs
85. [x] Screenshots — thumbnail JPEG 50% sauve en DB, affiche dans scan detail
86. [x] History enrichie — scan cards avec set/slot/quality/main/subs/eff, 6 filtres client-side
87. [x] Debug panel fix — uses API values (adjustedSetWeighted, adjustedPotential, setWeightRatio)
88. [x] Frame diff masks — ignores masked zones in comparison (no rescan on sell button change)
89. [x] Pagination ALL APIs — ezauth, ezbill, ezpay, green-pulse (13 endpoints added)
90. [x] Bug report system — categories, status flow, report filter, badge

</details>

---

## Audit complet (2026-03-29)

### A. Bugs et dette technique

#### A1. Scan doublons — cache hash pas efficace `P0`

**Status :** `planned` | **Effort :** M

- `quickHash()` echantillonne ~1000 pixels, hash trop faible (32-bit)
- Meme rune photographiee 2x a un hash different (bruit camera, compression)
- Solution : perceptual hash (pHash/dHash) sur le crop ROI, tolerance Hamming

#### A2. `as unknown as` massif dans scan-service et reanalyze `P1`

**Status :** `planned` | **Effort :** M

- `scan-service.ts` : 3x `as unknown as` pour convertir ParsedData -> RuneData -> ScanResult
- `reanalyze-scan.ts` : 3x idem
- Cause : `ParsedData` locale != `RuneData` de `@gacha-analyzer/types`, memes champs mais types separes
- Solution : aligner ParsedData sur RuneData directement, supprimer les double casts

#### A3. `Record<string, any>` dans 5 routes API `P2`

**Status :** `planned` | **Effort :** S

- `get-scan.ts`, `feedback-scan.ts`, `report-scan.ts`, `reanalyze-scan.ts`, `import-monsters.ts`
- Utilise pour le mapping `_id -> id` car Mongoose `.lean()` retourne un type generique
- Solution : typer correctement avec `Scan & { _id: Types.ObjectId }`

#### A4. `zones: any` et `masks: any` dans use-game-config.ts `P2`

**Status :** `planned` | **Effort :** S

- Legacy hooks (`GameConfigData`) avec 2 `any` restants
- Solution : typer avec les vrais types (`ZoneConfig[]`, `MaskRect[]`) ou supprimer les hooks deprecated

#### A5. `as any` dans scan detail page `P2`

**Status :** `planned` | **Effort :** S

- `scan/[id]/page.tsx:237` : `rune={scan.result.data as any}`
- `scan/[id]/page.tsx:246` : `gear={scan.result.data as any}`
- Cause : `ScanResult.data` est un union `RuneData | GearData`, pas narrowe avant usage
- Solution : discriminated union avec un champ `type` ou narrower via `gameType`

#### A6. TODO dans types/ — valeurs non verifiees `P2`

**Status :** `planned` | **Effort :** S

- `artifact-data.ts:7` : `atk: 100, // TODO: verify exact value`
- `rune-data.ts:28-32` : 3 TODO sur les ranges de flat stats (hp, atk, def)
- Solution : verifier in-game et fixer les valeurs

#### A7. Code duplique : handleSignificantChange et handleRescan `P2`

**Status :** `planned` | **Effort :** M

- `scan/page.tsx` : logique quasi identique (crop -> mask -> preprocess -> blob -> scan) dans 2 callbacks (~80 lignes x2)
- Solution : extraire une fonction `buildScanPayload(frame, roi, masks, profile, presets)`

#### A8. Fichier rune-card-compact.tsx trop gros (1072 lignes) `P2`

**Status :** `planned` | **Effort :** M

- Contient : score display, substat list, gem/grind reco, narrative summary, debug panel toggle
- Solution : extraire `rune-score-badge.tsx`, `rune-substat-list.tsx`, `rune-narrative.tsx`

#### A9. scan-service.ts trop gros (699 lignes) `P2`

**Status :** `planned` | **Effort :** M

- Contient : OCR orchestration, bench mode, zone OCR, Gemini fallback, merge logic, DB write
- Solution : extraire `ocr-pipeline.ts` (OCR + merge), garder DB write dans scan-service

#### A10. rune-efficiency.ts trop gros (1664 lignes) `P2`

**Status :** `planned` | **Effort :** L

- Contient : efficiency calc, tier system, roll breakdown, gem logic, progressive advice, archetype synergy
- Solution : extraire `gem-logic.ts`, `progressive-advice.ts`, `archetype-synergy.ts`

#### A11. Deprecated hooks dans use-game-config.ts `P3`

**Status :** `planned` | **Effort :** S

- `useGameConfig` et `useSaveGameConfig` marques @deprecated
- Utilises nulle part (remplace par useGameLayouts/useGameLayout)
- Solution : supprimer

---

### B. Qualite API

#### B1. Pas d'auth sur POST /scan (endpoint principal) `P1`

**Status :** `planned` | **Effort :** S

- `scan-image.ts` n'a pas `authMiddleware`
- N'importe qui peut poster des images et consommer des ressources OCR/Gemini
- Routes protegees : DELETE scan, PUT/DELETE config seulement
- Solution : ajouter au minimum optionalAuthMiddleware ou rate limit renforce

#### B2. Thumbnails JPEG 50% stockes directement en MongoDB `P2`

**Status :** `planned` | **Effort :** M

- Base64 JPEG ~50-100KB par scan, directement dans le document Scan
- A 10k scans = 500MB-1GB en thumbnails dans Mongo
- Solution : S3/R2 pour les images, ou au minimum compresser davantage (25%, resize 200px)

#### B3. Pas de cleanup des vieux scans `P2`

**Status :** `planned` | **Effort :** S

- Pas de TTL, pas de limite par user, pas de retention policy
- Solution : TTL index MongoDB (90 jours?) ou endpoint de purge

#### B4. Image size limit non explicite `P2`

**Status :** `planned` | **Effort :** S

- multer config non visible (probablement default = no limit)
- Solution : limiter a 10MB, retourner 413

#### B5. Gemini fallback hardcode pour SW uniquement `P3`

**Status :** `planned` | **Effort :** S

- `scan-service.ts:615` : `if (needsFallback && gameType === 'summoners-war')`
- Nikke n'a pas de fallback IA
- Solution : generaliser le prompt Gemini par jeu quand Nikke analyzer existe

---

### C. UX / Frontend

#### C1. Pas de support mobile camera directe `P1`

**Status :** `planned` | **Effort :** L

- getDisplayMedia() = desktop screen capture uniquement
- Sur mobile : pas d'API pour capturer l'ecran d'une autre app
- Solution : ajouter mode "upload photo" pour mobile (camera ou galerie), meme si le mode capture est supprime
- Alternative : PWA + share target pour recevoir screenshots

#### C2. Hardcoded "Cached" string dans scan page `P2`

**Status :** `planned` | **Effort :** S

- `scan/page.tsx:622` : `<Badge>Cached</Badge>` non traduit (i18n)
- Solution : `t('scan.statusBar.cached')`

#### C3. Emojis dans les selects (history page) `P3`

**Status :** `planned` | **Effort :** S

- `history/page.tsx:200-201` : emoji dans les SelectItem (`agree`, `disagree`)
- Contraire aux DEV-RULES (pas d'emojis dans le code)
- Solution : icones SVG ou badges colores

#### C4. Inline SVG icons dans scan page `P2`

**Status :** `planned` | **Effort :** S

- 2 inline SVG (settings gear, rescan arrows) dans scan/page.tsx
- Solution : extraire dans un fichier icons ou utiliser lucide-react

#### C5. Flash colors hardcoded en rgba() inline `P3`

**Status :** `planned` | **Effort :** S

- `scan/page.tsx:189-197` : couleurs en dur au lieu de CSS variables
- Commentaire explique pourquoi (dynamic alpha) mais pourrait utiliser CSS custom properties + opacity

#### C6. History : filtres client-side sur donnees paginees serveur `P1`

**Status :** `planned` | **Effort :** M

- 6 filtres (level, advice, set, slot, feedback, report) appliques en JS sur la page courante
- Quand on filtre par "set=violent", on ne voit que les violent de la page courante (20 items), pas tous les violent en DB
- Solution : deplacer les filtres cote serveur (query params API) pour des resultats corrects

#### C7. Nikke : pas de rune card / gear analysis `P1`

**Status :** `planned` | **Effort :** XL

- Parser Nikke existe (8 tests) mais pas d'analyzer, pas de gear card dediee, pas de /data Nikke
- GearCard basique existe mais pas d'equivalent efficiency/advice
- Solution : cf. section E (Feature gaps)

---

### D. Tests

#### D2. Tests dupliques dans 2 dossiers `P3`

**Status :** `planned` | **Effort :** S

- `api/src/__tests__/` et `api/src/analyzers/rune-efficiency.test.ts` (304L) en plus de `api/src/__tests__/rune-efficiency.test.ts` (1206L)
- Solution : consolider dans `__tests__/`

---

## E. Feature Gaps (roadmap)

### E1. Nikke gear analyzer `P1`

**Status :** `planned` | **Effort :** XL

- [ ] Nikke efficiency calculator (manufacturer bonuses, overload lines)
- [ ] Gear card dediee avec visuels Nikke
- [ ] Page /data Nikke (manufacturers, gear types, overload tiers)
- [ ] Gem/grind equivalent pour Nikke (reroll overload)
- [ ] Advice system Nikke (keep/reroll/lock)

### E2. Detection grind existant (couleur verte in-game) `P1`

**Status :** `planned` | **Effort :** L

- Les stats grindees apparaissent en vert dans SW
- OCR ne detecte pas la couleur actuellement (grayscale preprocessing)
- Solution : analyser les pixels de couleur avant grayscale, ou zone-based color detection
- Impact : gem recommendations actuelles ne savent pas si une stat est deja grindee

### E3. Batch scanning (multi-rune) `P2`

**Status :** `planned` | **Effort :** L

- Scanner toutes les runes d'un monstre d'un coup (6 slots)
- Naviguer automatiquement entre les runes via detection de l'UI
- Afficher un resume du monstre complet (efficiency totale, sets, synergies)

### E4. Fallback IA cascade (Gemini free tier) `P2`

**Status :** `planned` | **Effort :** M

- Actuellement : 3 models Gemini en cascade (flash, flash-lite, 1.5-flash)
- Ajouter : retry avec backoff, queue de fallback, cache des resultats IA
- Tester avec d'autres providers (Claude Vision, GPT-4o)

### E5. Import depuis export JSON (SWEX/SWProxy) `P2`

**Status :** `planned` | **Effort :** M

- Les joueurs SW utilisent SWEX pour exporter leur compte en JSON
- Parser le JSON d'export (runes + monstres + artefacts)
- Permet une analyse massive sans OCR (100% precis)
- Dashboard : top runes, worst runes, runes a vendre, coverage par set

### E6. Integration SWSTATS/Lucksack pour builds populaires `P2`

**Status :** `planned` | **Effort :** M

- Fetch les builds populaires depuis les APIs communautaires
- Recommander des monstres pour une rune basee sur les builds populaires
- "Cette rune SPD/CR/CD/ATK% serait parfaite pour Savannah (usage: 89%)"

### E7. Rune optimizer (quelles runes garder pour quel monstre) `P3`

**Status :** `planned` | **Effort :** XL

- Etant donne un roster de monstres et un inventaire de runes
- Calculer l'assignment optimal (rune -> monstre)
- Complexite : NP-hard, heuristiques necessaires
- Pre-requis : E5 (import JSON) ou batch scanning (E3)

### E8. Compare runes `P3`

**Status :** `planned` | **Effort :** M

- Comparer 2+ runes cote a cote (meme slot)
- Overlay visuel des differences (efficiency, rolls, gem potential)
- Utile pour decider entre 2 runes pour un slot

### E9. Share rune analysis `P3`

**Status :** `planned` | **Effort :** M

- Generer une image/lien partageable d'une analyse de rune
- OG image pour les previews social
- Deep link vers le scan detail

### E10. Artifact analysis `P3`

**Status :** `planned` | **Effort :** L

- Parser artifact existe (33 substats, 10 tests) mais pas d'analyzer
- Efficiency calculator pour artifacts (differents rolls, differents tiers)
- Artifact card + /data artifacts
- Pre-requis : definir le scoring system (pas de formule Barion pour les artifacts)

### E11. Overlay/PiP pour afficher resultats sur le jeu `P3`

**Status :** `planned` | **Effort :** L

- Picture-in-Picture API pour afficher un mini-overlay sur le jeu
- Affiche le conseil (SELL/KEEP/UPGRADE) en temps reel
- Necessite : Chrome PiP API + canvas rendering

### E12. Multiple game support (au-dela de SW + Nikke) `P3`

**Status :** `planned` | **Effort :** XL

- Architecture multi-game en place (config/games/[game].ts, images/[game]/)
- Candidats : Epic Seven, Genshin Impact, Honkai Star Rail
- Chaque jeu necessite : parser, analyzer, types, game config, i18n, assets

### E13. Deploy (Railway API + Vercel Web) `P1`

**Status :** `planned` | **Effort :** M

- [ ] Railway service pour l'API (gacha-analyzer-api)
- [ ] Variables d'env Railway (MONGODB_URI, GEMINI_API_KEY, EZAUTH_URL)
- [ ] Vercel project pour le web
- [ ] Verifier que sharp (image processing) fonctionne sur Railway
- [ ] Tester OCR Tesseract sur Railway (binaire natif requis)

---

## Priorites suggerees

### Sprint 1 — Stabilisation (bugs + deploy)

1. A1 — Fix scan doublons (perceptual hash)
2. B1 — Auth/rate limit sur POST /scan
3. C6 — Filtres history cote serveur
4. A2 — Supprimer les `as unknown as` (aligner types)
5. E13 — Deploy Railway + Vercel
6. C1 — Mode upload photo pour mobile

### Sprint 2 — Qualite code

7. A7 — Extraire buildScanPayload (deduplicate scan page)
8. A8 — Split rune-card-compact.tsx
9. A9 — Split scan-service.ts
10. A3 — Typer les routes API (supprimer Record<string, any>)
11. A4+A5 — Supprimer les any restants
12. C2+C3+C4 — Petits fixes UX (i18n, emojis, icons)

### Sprint 3 — Nikke + Features

13. E1 — Nikke gear analyzer complet
14. E2 — Detection grind existant
15. E4 — Fallback IA ameliore
16. E5 — Import SWEX JSON

### Sprint 4 — Advanced features

17. E3 — Batch scanning
18. E6 — Integration builds populaires
19. E8 — Compare runes
20. E10 — Artifact analysis

---

## Notes

- L'utilisateur joue a Summoners War et Nikke Goddess of Victory
- Prioriser le scanning rapide et stable sur la precision IA
- Interface mobile-friendly (utilisation depuis telephone)
- Capture d'ecran via getDisplayMedia + ROI selector rouge draggable
- Approche inspiree de SWLENS (capture continue + analyse auto)
- Pipeline fonctionne end-to-end : capture -> crop -> OCR -> rawText affiche
- Parser SW robuste : hardcoded main stats, fuzzy matching, multiline support, validation ranges
- Synergy scoring avec 14 archetypes + gem/roll awareness
- Player profile par jeu (early/mid/late) persiste en localStorage avec level strictness
- Zoomed ROI preview avec drag + scroll zoom en resolution native
- Image preprocessing : upscale + contrast + binarize pour meilleure precision OCR
- callApi dans fetch-client fixe pour supporter FormData
- Formule Barion normalisee 0-100% (current + potential efficiency, keep/sell)
- Dev scripts utilisent turbo stream mode (pas de TUI qui efface les logs)
- 149 tests passent (3314 lignes de tests API, 0 tests web)
- OCR confidence : 90-99% avec zones individuelles + masques
- Le parsing par zones est prioritaire sur le parsing global
- Les layouts (zones + masques + ROI + presets) sont sauvegardes en MongoDB par jeu
- Sentry integre (instrument.mjs)
- i18n complet (338 cles en/fr)
- OpenAPI/Swagger documente (15 operations)
