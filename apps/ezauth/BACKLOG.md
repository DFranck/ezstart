# Backlog — EZAuth

**Status :** `maintained` | **Dernière mise à jour :** 2026-03-28

## Objectif
SSO Authentication service pour le monorepo @ezstart.

## Étapes
1. [ ] UX: fix renders bizarres quand on arrive sur ezauth web (flash/layout shift)
2. [ ] Migrer les routes admin vers format { success, data, meta } standard
3. [ ] Ajouter React Query dans ezauth web (actuellement raw fetch)
4. [ ] Standardiser les réponses auth (login, register, token) vers { success, data }

## Notes
- ezauth est le service le plus critique — utilisé par TOUTES les apps
- Le JWT auth fonctionne bien, le middleware est solide
- L'auth-sdk (httpOnly/localStorage adaptatif) est mature
- Les routes admin manquent de validation Zod stricte
