# Loop — the only pipeline

Tout livrable (feature, fix, refactor, nouveau package) passe cette boucle. Pas d'étapes numérotées, pas d'agents spécialisés : juste `dev → auditor → fix → auditor → commit`.

---

## La boucle

```
 user request
      ↓
 ┌──────────┐
 │   dev    │  lit standard.md, implémente, report changes
 └────┬─────┘
      ↓
 ┌──────────┐
 │ auditor  │  exécute audit complet standard.md, retourne PASS ou FAIL + list
 └────┬─────┘
      ↓
   PASS ────────────→ commit + push
      ↓
   FAIL
      ↓
 ┌──────────┐
 │   dev    │  fix les points FAIL listés
 └────┬─────┘
      ↓
   (boucle)
```

**Règle absolue** : pas de commit tant que `auditor` retourne `PASS`. Jamais de "on verra plus tard".

---

## Comment je l'invoque (Claude)

Pour une mission type "crée le SDK X" ou "migre les apps vers Y" :

1. **Clarifier** — si le brief est ambigu, demander à l'utilisateur 1-2 questions ciblées avant de lancer un agent.
2. **Lancer `dev`** — en background (`run_in_background: true`) avec brief complet + renvoi à `standard.md`.
3. **À la fin du dev**, lancer `auditor` en background sur le même scope.
4. **Si auditor retourne FAIL** → relancer `dev` avec la liste des gaps.
5. **Si auditor retourne PASS** → review humaine express (je lis les diffs), puis commit.

Pour une mission type "fix ce bug précis" (<5 fichiers) :

- Dev direct par moi (Claude), puis auditor minimal manuel (grep + typecheck), puis commit.
- Déléguer à `dev` agent seulement si scope > 5 fichiers ou domaines multiples.

---

## Multi-agent parallèle

Plusieurs missions non-conflictuelles → agents en parallèle (pas de conflit de fichiers). Chaque agent a sa propre boucle `dev → auditor`. Je tracke les notifications indépendamment.

**Règle** : ne jamais lancer 2 agents qui touchent le même dossier en parallèle.

---

## Commit

Après `PASS` :

1. Je lis les diffs (trust but verify)
2. Message commit structuré (type: scope: subject + body explicatif + validation summary)
3. Pas de `--no-verify` sauf hotfix prod documenté
4. Push sur la branche courante (jamais direct master sauf hotfix admin)

---

## Référence

- [`.claude/rules/standard.md`](../rules/standard.md) — le checklist que `auditor` applique
- [`.claude/agents/dev.md`](../agents/dev.md) — rôle implémenteur
- [`.claude/agents/auditor.md`](../agents/auditor.md) — rôle vérificateur
