# 🖥️ VSCode Setup Guide - @ezstart Monorepo

**Guide complet pour synchroniser ton environnement VSCode sur un nouveau PC (Windows/Mac).**

## 📋 Étape 1 : Synchronisation du Compte

### Option A : Settings Sync (Recommandé)

VSCode a une fonctionnalité de synchronisation intégrée qui synchro automatiquement :
- Extensions
- Settings (User + Workspace)
- Keybindings
- Snippets
- UI State

**Activation :**
1. Sur ton PC actuel (Windows) :
   - `Ctrl+Shift+P` → "Settings Sync: Turn On"
   - Connecte-toi avec ton compte GitHub ou Microsoft
   - Sélectionne ce que tu veux synchroniser

2. Sur ton nouveau Mac :
   - Ouvre VSCode
   - `Cmd+Shift+P` → "Settings Sync: Turn On"
   - Connecte-toi avec le même compte
   - Tout se télécharge automatiquement ! ✅

### Option B : Manuel (Si Settings Sync ne fonctionne pas)

Utilise ce guide pour installer manuellement.

---

## 🔌 Étape 2 : Extensions à Installer

**Liste complète des extensions (35 extensions) :**

### Essentielles (OBLIGATOIRES)
```bash
# Claude Code
code --install-extension anthropic.claude-code

# TypeScript/JavaScript
code --install-extension loiane.ts-extension-pack
code --install-extension pmneo.tsimporter
code --install-extension stringham.move-ts
code --install-extension yoavbls.pretty-ts-errors

# Formatters
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint

# React
code --install-extension burkeholland.simple-react-snippets
code --install-extension dsznajder.es7-react-js-snippets
code --install-extension xabikos.reactsnippets

# Tailwind CSS
code --install-extension bradlc.vscode-tailwindcss

# Git
code --install-extension mhutchie.git-graph

# Path Autocomplete
code --install-extension christian-kohler.path-intellisense

# Error Highlighting
code --install-extension usernamehw.errorlens
```

### Utilitaires (RECOMMANDÉES)
```bash
# Auto Rename Tag
code --install-extension formulahendry.auto-rename-tag

# Spell Checker
code --install-extension streetsidesoftware.code-spell-checker
code --install-extension streetsidesoftware.code-spell-checker-french
code --install-extension ban.spellright

# Color Tools
code --install-extension naumovs.color-highlight
code --install-extension kisstkondoros.vscode-gutter-preview

# Bracket Colors
code --install-extension bracketpaircolordlw.bracket-pair-color-dlw

# Indent Rainbow
code --install-extension oderwat.indent-rainbow

# HTML/CSS IntelliSense
code --install-extension ecmel.vscode-html-css

# JSON to TypeScript
code --install-extension gregorbiswanger.json2ts

# Prisma
code --install-extension prisma.prisma

# Live Server (pour tests locaux)
code --install-extension ritwickdey.liveserver

# SASS Compiler
code --install-extension glenn2223.live-sass

# PDF Viewer
code --install-extension tomoki1207.pdf

# Template String Converter
code --install-extension meganrogge.template-string-converter
```

### Thèmes (OPTIONNELS)
```bash
# Material Theme
code --install-extension zhuangtongfa.material-theme

# Material Icon Theme
code --install-extension pkief.material-icon-theme
```

### Remote Development (OPTIONNELS - Utile sur Mac)
```bash
# Remote Containers
code --install-extension ms-vscode-remote.remote-containers

# Remote WSL (Windows uniquement)
code --install-extension ms-vscode-remote.remote-wsl
```

### AI Assistants (OPTIONNELS)
```bash
# Codeium (alternative à Copilot)
code --install-extension codeium.codeium
```

---

## ⚙️ Étape 3 : Configuration Workspace

**Fichier `.vscode/settings.json` (déjà dans le repo) :**

```json
{
  "cSpell.words": [
    "anatine",
    "asteasolutions",
    "Autogen",
    "ezstart",
    "ingame",
    "Pixi",
    "Tetris",
    "Tétris",
    "tetromino",
    "TETROMINO",
    "turbopack"
  ],
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "prettier.prettierPath": "./node_modules/prettier",
  "[typescript]": {
    "editor.formatOnSave": true
  },
  "[typescriptreact]": {
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.formatOnSave": true
  },
  "spellright.language": ["en"],
  "spellright.documentTypes": ["plaintext", "markdown", "latex", "javascript", "html", "css"]
}
```

**⚠️ Ce fichier est déjà commité dans le repo, donc il s'appliquera automatiquement quand tu clones le projet.**

---

## 🖥️ Étape 4 : Configuration User Settings (Optionnel)

**Paramètres personnels (User Settings) :**

Ouvre `Cmd+Shift+P` → "Preferences: Open User Settings (JSON)"

```json
{
  // Apparence
  "workbench.colorTheme": "One Dark Pro",
  "workbench.iconTheme": "material-icon-theme",

  // Font
  "editor.fontFamily": "Fira Code, Menlo, Monaco, 'Courier New', monospace",
  "editor.fontLigatures": true,
  "editor.fontSize": 14,

  // Editor
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.wordWrap": "on",
  "editor.minimap.enabled": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",

  // Files
  "files.autoSave": "onFocusChange",
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/.turbo": true
  },

  // Terminal (Mac)
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.fontSize": 13,

  // Git
  "git.autofetch": true,
  "git.confirmSync": false,

  // TypeScript
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

---

## 🚀 Étape 5 : Cloner le Repo et Setup

### Sur Mac :

```bash
# 1. Installer Homebrew (si pas déjà fait)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Installer Node.js LTS (20.18.x)
brew install node@20

# 3. Installer pnpm
npm install -g pnpm@10.12.x

# 4. Cloner le repo
git clone https://github.com/[username]/ez-hub.git
cd ez-hub/@ezstart

# 5. Installer les dépendances
pnpm install

# 6. Copier les .env.example vers .env.local (pour chaque app/api)
# Exemple :
cp apps/ezauth/api/.env.example apps/ezauth/api/.env.local
# Remplir avec les valeurs réelles (MongoDB URLs, secrets, etc.)

# 7. Ouvrir dans VSCode
code .
```

### Vérifier que tout fonctionne :

```bash
# TypeCheck (doit passer sans erreur)
pnpm typecheck

# Build (doit réussir)
pnpm build

# Démarrer un service
pnpm dev:ez    # EZStart + Monitoring + APIs
pnpm dev:gp    # GreenPulse + EZAuth

# Ouvrir dans le navigateur
open http://localhost:5050    # EZStart
open http://localhost:5075    # GreenPulse
```

---

## 🔐 Étape 6 : Configuration Git (Important)

```bash
# Configurer ton identité Git
git config --global user.name "Ton Nom"
git config --global user.email "ton.email@example.com"

# Configurer SSH pour GitHub (recommandé)
ssh-keygen -t ed25519 -C "ton.email@example.com"
# Ajouter la clé publique à GitHub : https://github.com/settings/keys

# Tester la connexion
ssh -T git@github.com
```

---

## 📚 Étape 7 : Keybindings Utiles (Mac vs Windows)

| Action | Windows | Mac |
|--------|---------|-----|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Quick Open | `Ctrl+P` | `Cmd+P` |
| Terminal | `Ctrl+` ` | `Cmd+` ` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |
| Go to Definition | `F12` | `F12` |
| Rename Symbol | `F2` | `F2` |
| Find All References | `Shift+F12` | `Shift+F12` |
| Multi-Cursor | `Ctrl+Alt+↓` | `Cmd+Option+↓` |
| Select All Occurrences | `Ctrl+Shift+L` | `Cmd+Shift+L` |

---

## 🎯 Étape 8 : Vérification Complète

**Checklist pour vérifier que tout est OK :**

- [ ] VSCode Settings Sync activé et synchronisé
- [ ] Toutes les extensions installées (35 extensions)
- [ ] Workspace settings appliqués automatiquement
- [ ] Node.js 20.18.x installé
- [ ] pnpm 10.12.x installé
- [ ] Repo cloné
- [ ] `pnpm install` exécuté sans erreur
- [ ] `.env.local` créés pour chaque app/api
- [ ] `pnpm typecheck` passe sans erreur
- [ ] `pnpm build` réussit
- [ ] `pnpm dev:ez` démarre tous les services
- [ ] Git configuré avec ton identité
- [ ] SSH key ajoutée à GitHub

---

## 🆘 Troubleshooting

### Extensions ne se synchronisent pas

```bash
# Désactiver et réactiver Settings Sync
# Cmd+Shift+P → "Settings Sync: Turn Off"
# Cmd+Shift+P → "Settings Sync: Turn On"
```

### pnpm install échoue

```bash
# Supprimer node_modules et pnpm-lock.yaml
rm -rf node_modules pnpm-lock.yaml
pnpm install --force
```

### Ports déjà utilisés

```bash
# Mac : Tuer les processus Node.js
killall node

# Ou utiliser le script du monorepo
pnpm kill:ports
```

### Prettier ne formate pas

```bash
# Vérifier que Prettier est installé localement
pnpm install

# Redémarrer VSCode
Cmd+Q → Relancer VSCode
```

---

## 📝 Notes Importantes

1. **Settings Sync** est la méthode la plus simple pour synchroniser tout
2. Les **Workspace Settings** (`.vscode/settings.json`) sont déjà dans le repo
3. Sur **Mac**, utilise `Cmd` au lieu de `Ctrl` pour les raccourcis
4. Le monorepo nécessite **Node.js 20.18.x** (LTS) pour production
5. Tous les ports sont **auto-détectés** depuis `@ezstart/config`
6. Les **secrets** (`.env.local`) ne sont **jamais commités**, tu dois les créer manuellement

---

## 🚀 Prêt à Coder !

Une fois toutes ces étapes complétées, tu auras exactement le même environnement de développement sur ton Mac que sur ton PC Windows ! 🎉

**Lire ensuite :**
- [CLAUDE.md](../CLAUDE.md) - Guide complet du monorepo
- [DEV-RULES.md](../DEV-RULES.md) - Règles de développement obligatoires
- [docs/README.md](./README.md) - Dashboard des audits
