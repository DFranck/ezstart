# Loop — the only pipeline

Tout livrable (feature, fix, refactor, nouveau package) passe cette boucle. 3 rôles : `dev` (implémente), `auditor` (vérifie standard.md), `hacker` (casse et prouve les bugs).

---

## La boucle

```
 user request
      ↓
 ┌──────────┐
 │   dev    │  lit standard.md, implémente, écrit tests
 └────┬─────┘
      ↓
 ┌──────────┐
 │ auditor  │  exécute audit complet standard.md, retourne PASS ou FAIL + list
 └────┬─────┘
      ↓
   FAIL → dev fix → auditor → (boucle)
      ↓
   PASS
      ↓
 ┌──────────┐
 │  hacker  │  attaque le code, écrit tests qui prouvent les failles
 └────┬─────┘
      ↓
   CLEAN ──────────→ commit + push
      ↓
   VULNS FOUND
      ↓
 ┌──────────┐
 │   dev    │  fix les vulnérabilités
 └────┬─────┘
      ↓
 ┌──────────┐
 │  hacker  │  re-attaque le code fixé (nouveaux vecteurs possibles)
 └────┬─────┘
      ↓
   (boucle jusqu'à CLEAN)
```

**Règle absolue** : pas de commit tant que `auditor` retourne `PASS` ET `hacker` retourne `CLEAN`. Jamais de "on verra plus tard".

### Quand lancer le hacker ?

- **Toujours** : routes API (auth, payment, admin, webhook)
- **Toujours** : middleware (auth, CSRF, rate-limit, validation)
- **Toujours** : services manipulant des données sensibles (OAuth, tokens, passwords, payments)
- **Optionnel** : packages UI purs, config, documentation

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
