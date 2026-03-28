# Backlog — EZPay

**Status :** `maintained` | **Dernière mise à jour :** 2026-03-28

## Objectif
Payment System pour le monorepo @ezstart.

## Étapes
1. [ ] CRITICAL: Utiliser sk_test en dev, sk_live uniquement via Railway env vars
2. [ ] Standardiser les réponses API (payments→data, stats→data)
3. [ ] Ajouter React Query dans ezpay web si besoin

## Notes
- La clé Stripe LIVE ne doit JAMAIS être dans .env.local
- Le pay-sdk est le package partagé, ezpay est l'app
