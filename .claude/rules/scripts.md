## 📁 Scripts — Organisation Stricte

### Structure Obligatoire

```
scripts/
├── generators/          # Créent du code/des projets (réutilisables)
│   ├── create-api.js
│   ├── create-app.js
│   ├── create-web-app.js
│   └── generate-specialist-agents.js
├── tools/               # Utilitaires dev (réutilisables)
│   ├── kill-ports.ps1
│   ├── dev-status.ps1
│   ├── backup-mongodb.sh
│   ├── convert-images-webp.js
│   └── optimize-images.js
└── monitoring/          # Health checks & audits
    ├── check-all-services.sh
    └── generate-audit-report.sh
```

### Règles

- ✅ **TOUJOURS** placer les scripts dans le bon sous-dossier de `scripts/`
- ✅ **Scripts réutilisables** → `scripts/generators/` ou `scripts/tools/`
- ✅ **Scripts temporaires/one-shot** → les exécuter et les supprimer immédiatement, JAMAIS les commiter
- ❌ **JAMAIS** de scripts à la racine du monorepo (sauf configs: eslint, prettier, turbo)
- ❌ **JAMAIS** de dossier `tmp/` ou `src/` à la racine
- ❌ **JAMAIS** de fichiers `*.backup` dans le repo
- ❌ **JAMAIS** de scripts de test one-shot (test-_.js, fix-_.js, etc.) — utiliser les tests Vitest
