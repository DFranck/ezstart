# Step 0 — Init (nouveau workspace)

Quand l'utilisateur dit "init" sur un nouveau projet :

## 1. Analyser (agents en parallèle)

- Structure des dossiers et fichiers
- Stack technique (langages, frameworks, package manager)
- Patterns existants (routing, tests, composants)
- Configuration existante (tsconfig, eslint, CI/CD, deploy)
- Dépendances et architecture

## 2. Résumer — Présenter les findings au user

## 3. Proposer

- DEV-RULES.md adapté au projet
- BACKLOG.md vide avec template
- .claude/config.json avec naming conventions

## 4. Valider — Attendre approbation user

## 5. Créer — Agents écrivent les fichiers validés

## Socle universel (TOUJOURS appliqué)

- Typecheck/lint avant commit, jamais de secrets
- PascalCase composants, camelCase fonctions, UPPERCASE constantes, kebab-case dossiers
- Réutilisabilité maximale, pas de duplication, pas de dépendances circulaires
- `.env.example` committé, `.env.local` gitignored
- Commits conventionnels, jamais "Generated with Claude Code"
- Français pour la communication, concis et actionnable
