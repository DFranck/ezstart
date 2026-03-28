# 📋 Backlog — @ezstart Monorepo

**Ce fichier est la source de vérité pour les projets en cours et à venir.**
**Tout agent Claude DOIT le consulter au démarrage et peut reprendre n'importe quel projet.**

Usage : "reprend/continue [nom-du-projet]" → Claude lit le state, suit le workflow (plan → validation → agents).

---

## 🎮 game-analyzer

**Status :** `in-progress` | **Priorité :** haute | **Dernière mise à jour :** 2026-03-26

### Objectif
App pour scanner et analyser des screenshots de jeux (Summoners War runes, Nikke Goddess of Victory gear, etc.) via OCR scripté + fallback IA optionnel.

### Architecture décidée

```
packages/
└── ocr-sdk/                  ← Nouveau package réutilisable
    ├── src/
    │   ├── index.ts
    │   ├── engines/          ← Tesseract, etc.
    │   ├── parsers/          ← Regex parsers par jeu
    │   └── types.ts
    └── README.md

apps/
└── game-analyzer/
    ├── web/                  ← Next.js, tous les providers standard
    ├── api/                  ← Express, @ezstart/express-core
    └── types/                ← Types partagés web+api (Rune, Gear, Scan, etc.)
```

### Décisions prises
- OCR scripté (Tesseract + regex) = chemin principal (~100ms)
- IA vision = fallback optionnel pour cas edge (~2-3s)
- `packages/ocr-sdk/` car potentiellement réutilisable ailleurs
- Respecte toutes les règles monorepo (voir DEV-RULES.md)
- Providers standard : NextIntl + ThemeProvider + AuthProvider + ErrorBoundary + Toaster
- Ports à réserver dans `@ezstart/config` urls.ts

### Étapes
1. [x] Rédiger plan détaillé (tâches par agent)
2. [x] Nettoyer refs obsolètes port 5080 → 5000
3. [x] Ajouter ports 5080/5085 dans `@ezstart/config`
4. [x] Créer `packages/ocr-sdk/` — moteur OCR + types + helpers
5. [x] Créer `apps/game-analyzer/types/` — Rune, Gear, Scan, Game
6. [x] Créer `apps/game-analyzer/api/` — Express + routes action-based + multer
7. [x] Parser Summoners War (runes) — 16 tests
8. [x] Parser Nikke (gear) — 8 tests
9. [x] Créer `apps/game-analyzer/web/` — Next.js mobile-first
10. [x] Client layout avec nav, auth, i18n
11. [x] Engine efficacité Barion — 15 tests
12. [x] Screen capture + frame diff + ROI selector draggable
13. [x] Fix fetch-client FormData, turbo stream mode, dev scripts cross-platform
14. [x] Pipeline end-to-end : capture → crop ROI → OCR Tesseract → affichage rawText
15. [x] Parser robuste (hardcoded main stats, fuzzy matching, multiline, validation ranges)
16. [x] Synergy scoring (5 archetypes, gem/roll awareness)
17. [x] Profile selector par jeu (early/mid/late) avec seuils + level strictness
18. [x] Zoomed ROI preview (drag + scroll zoom, résolution native)
19. [x] Image preprocessing (grayscale + contrast + binarize)
20. [x] Bouton rescan manuel
21. [x] Fix efficacité Barion (0-100%, tier display, set bonus)
22. [x] Bench mode — 3 sources × 8 presets × zones individuelles = 24 OCR runs
23. [x] 8 zones de lecture (setSlot, mainStat, quality, innate, sub1-4)
24. [x] Masques rouges (bench) / marron (scan) pour cacher les boutons UI
25. [x] Dual preview (tabs zoom/full) avec lock toggle
26. [x] Layouts nommés en DB (rune-manager, power-up, etc.)
27. [x] Import 1001 monstres SWARFARM avec suggestions par archetype
28. [x] Theme SW CSS variables (OKLCH, roll quality, tiers, elements)
29. [x] Profil joueur envoyé à l'API
30. [x] 14 build archetypes avec gem/roll awareness
31. [x] Artifact types + parser (33 substats, 10 tests)
32. [x] Mode unifié zoom+ROI (full window + zoom + drag ROI)
33. [x] Upload mode supprimé — capture only
34. [x] UX pass : settings collapsibles, compact RuneCard, gaming homepage
35. [x] Game banners SVG + rune set icons SWARFARM
36. [x] Interactions séparées : left=ROI, middle=pan, Ctrl+scroll=zoom
37. [x] 3 rune card templates (compact/detailed/gaming) avec sélecteur
38. [x] Skeletons permanents pour tous les templates
39. [x] Roll breakdown par substat avec badges qualité SW
40. [x] Roll Quality séparé (current vs post-gem)
41. [x] Gem/grind recommendations par archetype avec icônes
42. [x] Set affinity — archetypes priorisés par cohérence du set
43. [x] Flash background basé sur le conseil (sell=rouge, upgrade=bleu, keep=vert)
44. [x] Cache image hash — pas de rescan dupliqué
45. [x] Conseil progressif considère le potentiel
46. [x] Toutes couleurs via CSS variables (theme GA + globals)
47. [x] Advice simplifié — "↑ UPGRADE — 65% to keep"
48. [x] Page /data avec 11 sections de référence + tooltips
49. [x] SET_STAT_TIERS per set + setWeightedEfficiency dans le scoring
50. [x] Innate scoring (S=-20, A=-12, B=0, C=+5, D=-5)
51. [x] Low-roll penalty S/A tier + non-grindable penalty
52. [x] SET_STRENGTH (consensus communautaire S/A/B/C/D)
53. [x] Gem logic 100% set-based (plus archetype-based)
54. [x] Archetypes retirés du scoring principal (info secondaire)
55. [x] Rune card compact : badge simplifié + breakdown score +/-
56. [x] Page /data mergée 14→10 sections, sprites rune sets, tableau unifié
57. [x] Page /sources créée (APIs, wikis, outils, GitHub)
58. [x] Home : images de fond par jeu + logos PNG (plus d'emojis)
59. [x] Banner décoratif avec H1 overlay sur les pages jeu
60. [x] UX scan : bouton paramètres à côté de capture, settings en dessous
61. [x] Scripts dev:x clean .next automatiquement (rimraf)
62. [x] Architecture multi-game : images/[game]/, config/games/[game].ts
63. [x] Theme CSS splité : common + summoners-war + nikke
64. [x] Assets Nikke : 12 icons (manufacturers, gear types, rarities)
65. [x] Halo lumineux sur logos de jeu (drop-shadow)
66. [x] Banner margin dynamique (ResizeObserver sur header)
67. [x] Charts package UI — Recharts + DataTable installés, /data refactoré avec radar chart + DataTables
68. [x] DataTable package UI — @tanstack/react-table + sort/filter/pagination, utilisé dans /data
69. [x] Refacto OCR SDK — parsers/analyzers dans game-analyzer/api, SDK 100% agnostique
70. [x] Ancient runes — détection "A" OCR, ranges in-game vérifiés (HP% 6-10), base vs roll séparé, badge Ancient
71. [x] Hot reload API — tsx watch < NUL (fix Windows/turbo PTY bug)
72. [x] Scoring fixes — quality/mismatch penalty, potential set-weighted, seuils resserrés, low-roll avg-based
73. [x] UI card compact — value/max total, powerup rolls individuels, breakdown score, gem breakdown
74. [x] Gem logic v2 — rolls protègent massivement (+0.4/powerup), gem la stat avec least rolls + low tier
75. [x] Gem/Grind sprites — gem+set overlay, grind+set, ban icon non-grindable, tooltips ranges
76. [x] Main stat tier scoring — factor multiplicateur (S=1.0, B=0.8, C=0.6) pour slots 2/4/6
77. [x] Résumé narratif — "Pourquoi SELL/UPGRADE?" avec ✅/❌ + gem/grind reco, toujours visible
78. [x] Debug panel expandable — flow complet coloré (gris/vert/rouge), 3 profils côte à côte
79. [x] History page fix — _id→id mapping, confidence display, scan cards avec set/slot/advice badge
80. [x] Scan detail fix — memory:// image fallback, confidence ×100 fix
81. [x] Re-analyser — endpoint API + bouton pour re-parser avec nouveau code (en cours)
82. [x] Scan feedback — agree/disagree + commentaire, filtre history, badge scan card
83. [x] Estimation rolls — parser (aX%) hints du rawText, 6 tests, rollHints dans RuneData
84. [x] OpenAPI/Swagger — 15 operations documentées, /docs exposé sur localhost:5080/docs
85. [x] Screenshots — thumbnail JPEG 50% sauvé en DB, affiché dans scan detail
86. [x] History enrichie — scan cards avec set/slot/quality/main/subs/eff, 6 filtres client-side
87. [ ] Détection grind existant (couleur verte in-game → savoir si stat déjà grindée)
88. [ ] Fallback IA cascade (Gemini free tier)
89. [ ] Nikke gear analyzer (parser, analyzer, gear cards, /data Nikke)
90. [ ] Intégration SWSTATS/Lucksack API pour builds populaires
91. [ ] Deploy (Railway API + Vercel Web)
92. [ ] Overlay/PiP pour afficher résultats sur le jeu

### Notes
- L'utilisateur joue à Summoners War et Nikke Goddess of Victory
- Prioriser le scanning rapide et stable sur la précision IA
- Interface mobile-friendly (utilisation depuis téléphone)
- Capture d'écran via getDisplayMedia + ROI selector rouge draggable
- Approche inspirée de SWLENS (capture continue + analyse auto)
- Pipeline fonctionne end-to-end : capture → crop → OCR → rawText affiché
- Parser SW robuste : hardcoded main stats, fuzzy matching, multiline support, validation ranges
- Synergy scoring avec 14 archetypes + gem/roll awareness
- Player profile par jeu (early/mid/late) persisté en localStorage avec level strictness
- Zoomed ROI preview avec drag + scroll zoom en résolution native
- Image preprocessing : upscale + contrast + binarize pour meilleure précision OCR
- callApi dans fetch-client fixé pour supporter FormData
- Formule Barion normalisée 0-100% (current + potential efficiency, keep/sell)
- tower-defense supprimé du monorepo (-22k lignes)
- Dev scripts utilisent turbo stream mode (pas de TUI qui efface les logs)
- 149 tests passent
- OCR confidence : 90-99% avec zones individuelles + masques
- Le parsing par zones est prioritaire sur le parsing global
- Les layouts (zones + masques + ROI + presets) sont sauvegardés en MongoDB par jeu

---

## 📱 claude-mobile

**Status :** `done` | **Dernière mise à jour :** 2026-03-22

### Résolution
L'utilisateur a un abonnement Anthropic Max plan qui inclut claude.ai/code.
Flow : téléphone → claude.ai/code → GitHub → commit/push → Vercel auto-deploy.
Pas besoin de VPS ni d'app custom.

---

<!-- Template pour nouveau projet :

## 🏷️ nom-du-projet

**Status :** `planned` | `in-progress` | `blocked` | `done` | **Priorité :** haute/moyenne/basse | **Dernière mise à jour :** YYYY-MM-DD

### Objectif
[Description courte]

### Architecture décidée
[Structure fichiers]

### Décisions prises
[Ce qui a été validé]

### Étapes
1. [ ] ...

### Notes
[Contexte important]

-->
