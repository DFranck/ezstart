# Agents — @ezstart Monorepo

**Deux rôles uniques**, invoqués en boucle par Claude (architect) :

| Role    | File                         | Purpose                                                                            |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------- |
| dev     | [`dev.md`](./dev.md)         | Implémente la mission en respectant [`../rules/standard.md`](../rules/standard.md) |
| auditor | [`auditor.md`](./auditor.md) | Vérifie que le livrable passe les 7 critères du standard — PASS ou FAIL            |

## Pipeline

Une seule boucle, documentée dans [`../pipeline/loop.md`](../pipeline/loop.md) :

```
user request
      ↓
     dev  →  auditor  →  PASS  →  Claude commits
                 ↓ FAIL
          dev fix  →  auditor  →  ...
```

Pas d'étapes numérotées. Pas d'agents spécialisés par domaine (i18n, security, ux, etc.). Les domaines sont des sections du `standard.md`, pas des rôles séparés.

## Rétro-compat

Les anciens agents spécialisés sont archivés dans [`../_archive/agents/`](../_archive/agents/) pour référence historique. Ne PAS les invoquer directement — leur contenu a été absorbé dans `standard.md`.
