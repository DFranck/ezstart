# 🚀 START NEW CLAUDE SESSION - COPY THIS PROMPT

## 📋 PROMPT À COPIER AU DÉBUT DE CHAQUE NOUVELLE CONVERSATION

```
IMPORTANT - CONTEXTE MONOREPO @ezstart:

1. Lis immédiatement CLAUDE.md section "GUIDE DE DÉMARRAGE POUR NOUVEAU CLAUDE"
2. Le monorepo est DÉJÀ OPTIMISÉ avec une architecture spécifique À RESPECTER

Configuration actuelle à NE PAS MODIFIER sans raison valide:
- ✅ Ports 50xx standardisés (APIs: 5010/5020/5030, Web: 5015/5025/5035/5045/5055/5065)
- ✅ TypeScript centralisé avec UN SEUL tsc -b --watch au root
- ✅ Architecture .env: .env.local (secrets) + .env.example (template)
- ✅ Packages avec configs centralisées (@ezstart/typescript-config, etc.)

Pour démarrer le développement:
Option 1 (OPTIMISÉ): 
  Terminal 1: pnpm dev:types
  Terminal 2: pnpm dev
Option 2 (SIMPLE): pnpm dev

Commandes utiles:
- pnpm dev:status → Vérifier l'état de tous les services
- pnpm kill:ports → Tuer tous les ports si problème
- pnpm dev:billing/td/ez → Développement ciblé

RÈGLES CRITIQUES:
1. JAMAIS de tsc --watch dans les scripts dev des packages
2. TOUJOURS .env.local pour les secrets (jamais .env direct)
3. TOUJOURS composite:true dans les tsconfig
4. TOUJOURS respecter les ports 50xx
5. TOUJOURS utiliser les configs centralisées avant du local

Vérifie d'abord avec pnpm dev:status si des services tournent déjà.
```

---

## 🎯 CHECKLIST POUR NOUVEAU CLAUDE

Après avoir copié le prompt ci-dessus:

1. **Lire CLAUDE.md** - Section "GUIDE DE DÉMARRAGE"
2. **Vérifier l'état** - `pnpm dev:status`
3. **Lancer si nécessaire** - Mode optimisé ou simple
4. **Respecter l'architecture** - Ne pas modifier sans raison

## 📊 RÉSUMÉ RAPIDE DE L'ARCHITECTURE

```
Monorepo @ezstart
├── 📦 Packages partagés (types, ui, auth-sdk, express-core...)
├── 🎯 Apps
│   ├── EZAuth (API:5010 + Web:5015)
│   ├── EZ-Billing (API:5020 + Web:5025)
│   ├── Tower Defense (API:5030 + Web:5035)
│   ├── EZStart (Web:5045)
│   ├── ASC-TCD (Web:5055)
│   └── FengShui (Web:5065)
└── 🔧 Configuration
    ├── TypeScript: UN SEUL tsc -b --watch au root
    ├── Ports: Pattern 50xx (APIs 50x0, Web 50x5)
    └── Env: .env.local (priorité) + .env.example (template)
```

## ⚠️ POINTS D'ATTENTION

- **Processus Node.js**: Le monorepo optimisé utilise ~15 processus au lieu de 50+
- **Background**: Les processus peuvent persister, vérifier avec `pnpm dev:status`
- **Ports conflicts**: Si erreur de port, tuer tous les Node.js et relancer
- **.env.local**: DOIT exister dans chaque API avec PORT=50x0

## 💬 PHRASE DE CONFIRMATION

Une fois que le nouveau Claude a lu ce fichier et CLAUDE.md, il devrait répondre:

> "J'ai bien pris connaissance de l'architecture du monorepo @ezstart. Configuration ports 50xx, TypeScript centralisé, et architecture .env comprise. Prêt à continuer le développement en respectant les standards établis."

---

*Dernière mise à jour: 12/09/2025 - 18:45*
*Monorepo 100% opérationnel avec tous les services sur les bons ports*