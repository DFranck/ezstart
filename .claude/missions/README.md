# 🤖 Specialist Agents - @ezstart Monorepo

Ce dossier contient les **agents spécialisés par domaine** pour auditer, améliorer et maintenir le monorepo @ezstart.

---

## 🎯 Concept

Chaque agent est un **expert dans son domaine** qui suit le cycle AUPD:
- **A**udit - Évalue l'état actuel
- **U**pdate - Implémente les corrections
- **P**ropose - Suggère les prochaines améliorations
- **D**ocument - Met à jour la documentation

**Objectif:** Maintenir tous les scores à 100/100

---

## 📋 Liste des Agents Spécialisés

### ✅ Agents Créés

| Agent | Fichier | Score | Audit Ref |
|-------|---------|-------|-----------|
| **I18N Specialist** | `i18n-specialist.md` | 85/100 | [I18N-AUDIT.md](../../docs/audits/I18N-AUDIT.md) |

### 🚧 Agents à Créer

| Agent | Fichier | Score Actuel | Priorité |
|-------|---------|--------------|----------|
| **Architecture Specialist** | `architecture-specialist.md` | 95/100 | High |
| **Monitoring Specialist** | `monitoring-specialist.md` | 100/100 | Medium |
| **Testing Specialist** | `testing-specialist.md` | 100/100 | Medium |
| **API Specialist** | `api-specialist.md` | 100/100 | Medium |
| **Performance Specialist** | `performance-specialist.md` | 82/100 | High |
| **UX Specialist** | `ux-specialist.md` | 96/100 | Medium |
| **Mobile UX Specialist** | `mobile-ux-specialist.md` | 93/100 | Medium |
| **Accessibility Specialist** | `accessibility-specialist.md` | 95/100 | Medium |
| **Security Specialist** | `security-specialist.md` | 88/100 | High |
| **Code Quality Specialist** | `code-quality-specialist.md` | 92/100 | Medium |
| **Documentation Specialist** | `documentation-specialist.md` | 95/100 | Medium |
| **Infrastructure Specialist** | `infrastructure-specialist.md` | 82/100 | High |
| **Dependencies Specialist** | `dependencies-specialist.md` | 90/100 | Medium |
| **SEO Specialist** | `seo-specialist.md` | 85/100 | Medium |
| **Web Apps Specialist** | `web-apps-specialist.md` | 90/100 | Medium |
| **Landing Pages Specialist** | `landing-pages-specialist.md` | 90/100 | Medium |
| **Databases Specialist** | `databases-specialist.md` | 100/100 | Low |
| **Audit Quality Specialist** | `audit-quality-specialist.md` | 92/100 | Low |

**Total:** 18 agents (1 créé, 17 à créer)

---

## 🛠️ Génération Automatique des Agents

### Option 1: Génération Manuelle (recommandé pour démarrage)

Pour chaque domaine, copier `TEMPLATE-SPECIALIST-AGENT.md` et remplacer:

```bash
DOMAIN_NAME → Nom du domaine (ex: "Architecture")
[DOMAIN] → Slug (ex: "architecture")
[XX]/100 → Score actuel du domaine
[LIST] → Lists spécifiques (packages, apps, fichiers)
[CRITERIA_X] → Critères de score
```

### Option 2: Script de Génération

<details>
<summary>Script Node.js pour générer tous les agents (cliquez pour voir)</summary>

```javascript
// scripts/generate-specialist-agents.js
const fs = require('fs')
const path = require('path')

const agents = [
  {
    name: 'Architecture',
    slug: 'architecture',
    score: 95,
    audit: 'ARCHITECTURE-AUDIT.md',
    packages: ['@ezstart/express-core', '@ezstart/auth-sdk', '@ezstart/pay-sdk', '@ezstart/rbac'],
    apps: ['All 8 apps'],
    priority: 'High',
    focus: 'Routing patterns, Action-based architecture, Dependency management'
  },
  {
    name: 'Monitoring',
    slug: 'monitoring',
    score: 100,
    audit: 'MONITORING-AUDIT.md',
    packages: ['@ezstart/monitoring'],
    apps: ['EZStart monitoring dashboard'],
    priority: 'Medium',
    focus: 'APM metrics, Plausible Analytics, Performance tracking'
  },
  // ... ajouter les 16 autres
]

function generateAgent(agent) {
  const template = fs.readFileSync('.claude/missions/TEMPLATE-SPECIALIST-AGENT.md', 'utf8')

  const content = template
    .replaceAll('[DOMAIN_NAME]', agent.name)
    .replaceAll('[DOMAIN]', agent.slug)
    .replaceAll('[XX]', agent.score)
    .replaceAll('docs/audits/[DOMAIN]-AUDIT.md', `docs/audits/${agent.audit}`)
    // ... autres remplacements

  const filename = `.claude/missions/${agent.slug}-specialist.md`
  fs.writeFileSync(filename, content, 'utf8')
  console.log(`✅ Generated: ${filename}`)
}

agents.forEach(generateAgent)
console.log(`\n🎉 Generated ${agents.length} specialist agents!`)
```

</details>

---

## 📖 Utilisation

### Invoquer un Agent

**Méthode 1: Mention directe**
```
"@i18n-specialist audit l'i18n"
"@architecture-specialist check l'architecture"
```

**Méthode 2: Demande générique**
```
"Audit i18n" → Claude charge automatiquement i18n-specialist.md
"Check l'architecture" → Claude charge architecture-specialist.md
"Améliore les perfs" → Claude charge performance-specialist.md
```

### Cycle Typique

1. **User:** "Audit i18n"
2. **Agent:** Lit l'audit, scanne le code, génère TODO list
3. **Agent:** Propose actions prioritaires avec impact
4. **User:** "Ok vas-y"
5. **Agent:** Implémente, teste, commit, documente
6. **Agent:** Résume changements et nouveau score

---

## 🎓 Best Practices pour Agents

### DO ✅

1. **Toujours lire l'audit** avant d'agir
2. **Prioriser Critical > High > Medium > Low**
3. **Proposer avant d'implémenter** (demander validation)
4. **Documenter chaque changement** (commit + audit update)
5. **Donner des estimations** (temps, impact score)
6. **Être spécifique** (fichiers, lignes, commandes exactes)

### DON'T ❌

1. Ne pas modifier hors du périmètre du domaine
2. Ne pas commit sans tests/validation
3. Ne pas proposer >5 actions à la fois (overwhelming)
4. Ne pas oublier de mettre à jour l'audit
5. Ne pas ignorer les règles dans DEV-RULES.md

---

## 📊 Coordination entre Agents

### Cas de Collaboration

**Exemple 1:** I18N + UX
- I18N traduit les strings
- UX vérifie que le design adapte les textes FR plus longs

**Exemple 2:** Architecture + Performance
- Architecture refactor le code
- Performance mesure l'impact

**Exemple 3:** Security + Infrastructure
- Security identifie une faille
- Infrastructure déploie le patch

### Protocol de Handoff

Quand un agent doit passer la main:
```
🤝 Handoff to @[other-agent]

Context:
- J'ai fait: [ACTION]
- Il reste: [TODO]
- Périmètre: [FILES/SCOPE]
- Blocker: [REASON]

@[other-agent] please continue from here.
```

---

## 🔄 Maintenance des Agents

### Mise à Jour Hebdomadaire

Chaque lundi, l'agent doit:
1. Lire son audit
2. Vérifier si le score a changé
3. Identifier nouveaux gaps
4. Proposer plan pour la semaine

### Révision Mensuelle

Chaque début de mois:
1. Revoir tous les critères de score
2. Ajuster les priorités selon roadmap
3. Mettre à jour connaissances (new tools, patterns)
4. Synchroniser avec autres agents

---

## 📈 Roadmap

### Q1 2026: Foundation (Actuel)
- [x] Template créé
- [x] I18N Specialist opérationnel
- [ ] 5 agents prioritaires (Architecture, Performance, Security, Infrastructure, Testing)

### Q2 2026: Expansion
- [ ] Tous les 18 agents opérationnels
- [ ] Score moyen >95/100
- [ ] Coordination automatique entre agents

### Q3 2026: Excellence
- [ ] Tous scores à 100/100
- [ ] Agents autonomes (CI/CD triggers)
- [ ] Dashboard de coordination

---

## 🎯 Quick Links

- [Template](./TEMPLATE-SPECIALIST-AGENT.md)
- [I18N Specialist](./i18n-specialist.md)
- [Audits Dashboard](../../docs/README.md)
- [Dev Rules](../../DEV-RULES.md)

---

**Note:** Ce système d'agents permet une amélioration continue et systématique du monorepo, avec un expert dédié à chaque domaine.
