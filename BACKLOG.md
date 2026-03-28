# 📋 Backlog — @ezstart Monorepo

**Ce fichier est la source de vérité pour les projets cross-project et infra.**
**Les backlogs per-app sont dans `apps/[app]/BACKLOG.md`.**

Usage : "reprend/continue [nom-du-projet]" → Claude lit le state, suit le workflow (plan → validation → agents).

---

## 📱 Applications

| App | Status | Backlog |
|-----|--------|---------|
| gacha-analyzer | in-progress | [apps/gacha-analyzer/BACKLOG.md](./apps/gacha-analyzer/BACKLOG.md) |
| ezbill | in-progress | [apps/ezbill/BACKLOG.md](./apps/ezbill/BACKLOG.md) |
| ezauth | maintained | [apps/ezauth/BACKLOG.md](./apps/ezauth/BACKLOG.md) |
| ezpay | maintained | [apps/ezpay/BACKLOG.md](./apps/ezpay/BACKLOG.md) |
| ezstart | maintained | [apps/ezstart/BACKLOG.md](./apps/ezstart/BACKLOG.md) |
| green-pulse | maintained | [apps/green-pulse/BACKLOG.md](./apps/green-pulse/BACKLOG.md) |
| fengshui | maintained | [apps/fengshui/BACKLOG.md](./apps/fengshui/BACKLOG.md) |
| asc-tcd | maintained | [apps/asc-tcd/BACKLOG.md](./apps/asc-tcd/BACKLOG.md) |

---

## 🔧 Monorepo / Infra / Cross-project

### Pagination rule
- Toutes les APIs doivent supporter la pagination `{ data, pagination }` — implémenté sur ezauth, ezbill, ezpay, green-pulse, gacha-analyzer

### Package agnosticity
- Tous les packages doivent être 100% agnostiques, pas de logique project-specific

### Monorepo tooling
<!-- Generators, CI, husky, etc. -->

### Cross-project items
<!-- Items qui touchent plusieurs apps -->

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
