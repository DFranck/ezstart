## 📝 Git et Documentation

### 1. Commits - Structure Recommandée

```
type: brief description

- Detailed changes list
- Technical modifications
- Documentation updates
- Impact/results
```

**Types :** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

### 2. Règles de Commit

✅ **TOUJOURS :**

- Commiter après chaque modification importante
- Documenter les changements de manière détaillée
- Mettre à jour CLAUDE.md pour nouvelles pratiques/règles
- Mettre à jour README des packages avant commit

❌ **JAMAIS :**

- Ajouter "Generated with Claude Code"
- Ajouter "Co-Authored-By: Claude"

### 3. Validation Pré-Commit OBLIGATOIRE

**AVANT chaque commit, vérifier :**

```bash
# OBLIGATOIRE — si ça fail, NE PAS commiter
pnpm typecheck
```

- ✅ `pnpm typecheck` DOIT passer avec 0 erreurs avant tout commit
- ✅ `pnpm test` si des API/packages ont été modifiés
- ✅ Vérifier qu'aucun secret n'est dans les fichiers stagés (.env, credentials, tokens)
- ❌ **JAMAIS** commiter si typecheck échoue — corriger d'abord
- ❌ **JAMAIS** push si le build risque de fail sur Railway/Vercel

### 4. Backlog Formatting

- App backlogs (`apps/*/BACKLOG.md`) utilisent `- [ ]` (tirets), **PAS** de listes numérotées (`1. [ ]`). Cela évite les conflits de merge quand plusieurs personnes ajoutent des items.
- Seul le BACKLOG racine du monorepo (`BACKLOG.md`) peut utiliser des numéros.

### 5. Documentation README

⚠️ **CRITIQUE pour packages** :

Après TOUTE modification de package dans `/packages/` :

1. ✅ Mettre à jour README.md du package
2. ✅ Ajouter exemples d'usage si nouvelle feature
3. ✅ Documenter breaking changes
4. ✅ Lister apps qui utilisent le package
