# 📋 Backlog — @ezstart Monorepo

**Ce fichier est la source de vérité pour les projets en cours et à venir.**
**Tout agent Claude DOIT le consulter au démarrage et peut reprendre n'importe quel projet.**

Usage : "reprend/continue [nom-du-projet]" → Claude lit le state, suit le workflow (plan → validation → agents).

---

## 🎮 game-analyzer

**Status :** `in-progress` | **Priorité :** haute | **Dernière mise à jour :** 2026-03-23

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
15. [ ] Améliorer parser SW pour extraire données structurées du texte OCR réel
16. [ ] Afficher RuneCard + EfficiencyDisplay quand parsing réussit
17. [ ] Ajouter OpenAPI/Swagger à l'API
18. [ ] Deploy (Railway API + Vercel Web)

### Notes
- L'utilisateur joue à Summoners War et Nikke Goddess of Victory
- Prioriser le scanning rapide et stable sur la précision IA
- Interface mobile-friendly (utilisation depuis téléphone)
- Capture d'écran via getDisplayMedia + ROI selector rouge draggable
- Approche inspirée de SWLENS (capture continue + analyse auto)
- Pipeline fonctionne end-to-end : capture → crop → OCR → rawText affiché
- Le parser SW doit être amélioré pour matcher le texte OCR bruité (bruit: caractères parasites, espaces manquants, boutons UI captés)
- callApi dans fetch-client fixé pour supporter FormData
- Formule Barion implémentée (current + potential efficiency, keep/sell)
- tower-defense supprimé du monorepo (-22k lignes)
- Dev scripts utilisent turbo stream mode (pas de TUI qui efface les logs)

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
