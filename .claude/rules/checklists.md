## 🎯 Checklist Création Nouveau Package

Quand tu crées un nouveau package dans `/packages/` :

- [ ] Vérifier si peut être ajouté à package existant
- [ ] Créer structure standard (src/, dist/, package.json, tsconfig.json)
- [ ] Utiliser config centralisée (@ezstart/typescript-config)
- [ ] Créer README.md complet avec exemples
- [ ] Ajouter exports propres dans src/index.ts
- [ ] Builder et vérifier TypeCheck
- [ ] Tester import dans une app
- [ ] Commiter avec message descriptif
- [ ] Mettre à jour CLAUDE.md si nouvelle pratique

---

## 🎯 Checklist Création Nouvelle App

Quand tu crées une nouvelle app dans `/apps/` :

- [ ] Vérifier structure : web/, api/, types/, utils/, config/
- [ ] APIs : Utiliser @ezstart/express-core + connectToMongo(dbName)
- [ ] Web : Utiliser configs centralisées (tailwind, eslint, tsconfig)
- [ ] Ajouter port dans packages/config/src/urls.ts
- [ ] Setup providers (ThemeProvider, AuthProvider)
- [ ] Créer .env.example avec toutes les variables
- [ ] Créer vercel.json (web) ou configurer Railway (api)
- [ ] Ajouter scripts standard (dev, build, lint, typecheck)
- [ ] Tester build local
- [ ] Commiter et pusher
- [ ] Déployer et vérifier production
