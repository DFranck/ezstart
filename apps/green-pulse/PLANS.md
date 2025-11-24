# GreenPulse.AI - Plans & Features

**Status:** November 2025

---

## Plans Overview

| Plan | Cible | Modèle |
|------|-------|--------|
| **Plan 1** - Self Awareness | CEO curieux | Gratuit |
| **Plan 2** - Impact démontrable | PME engagées | Payant |
| **Plan 3** - Conformité | Corporates, Prestataires | Premium |

---

## Plan 1 - Gratuit

### Features → TODO

| Feature | Status | Solution |
|---------|--------|----------|
| Chat IA ESG éducatif | ✅ DONE | `/chat` + LIA provider + streaming |
| Conseils comportementaux | ✅ DONE | System prompt ESG advisor |
| Session stateless | ✅ DONE | Conversations stockées mais accès limité |
| Dashboard aperçu flouté | ❌ TODO | Blur CSS + upgrade CTA |
| Triggers upgrade Plan 2 | ❌ TODO | Keywords detection → modal |

### AI Safety
- ✅ System prompt avec guardrails
- ❌ TODO: Ajouter disclaimers ("conseils éducatifs uniquement")
- ❌ TODO: Bloquer calculs précis (réservé Plan 2)

---

## Plan 2 - Payant

### Features → TODO

| Feature | Status | Solution |
|---------|--------|----------|
| Workspaces multi-tenant | ✅ DONE | CRUD + members + roles |
| Projects | ✅ DONE | Lié workspace + company info |
| Forms structurés | ✅ DONE | FormConfig + FormInstance + extraction IA |
| Chat → Form extraction | ✅ DONE | `/chat/extract` + confidence scores |
| Upload documents | ✅ DONE | Audio/Image/Document + transcription |
| Dashboard basique | ✅ DONE | Liste workspaces/projects/forms |
| ESG Service (externe) | ✅ DONE | OAuth2 + push data + reports |
| Multi-users (3) | ✅ DONE | Workspace members (owner/admin/member/viewer) |
| KPIs dashboard | ❌ TODO | Recharts + metrics service |
| Export PDF/Excel | ❌ TODO | pdfkit + xlsx |
| Scope 1/2/3 structuration | ❌ TODO | DB schema + UI catégorisation |
| Historique comparatif | ❌ TODO | Timeline + before/after |

### AI Safety
- ✅ Confidence scores sur extraction
- ✅ Champs basse confiance en orange
- ❌ TODO: Facteurs émission officiels (ADEME, EPA)
- ❌ TODO: Validation humaine obligatoire <85% confidence

---

## Plan 3 - Premium

### Features → TODO

| Feature | Status | Solution |
|---------|--------|----------|
| Multi-sites/filiales | ❌ TODO | Sites model + consolidation |
| Frameworks GRI/CSRD/IFC | ❌ TODO | JSON configs + checklist IA |
| Upload audits externes | ❌ TODO | OCR + extraction + review |
| Rapports conformes | ❌ TODO | Templates investisseur/admin |
| Rôles différenciés (10+) | ❌ TODO | RBAC étendu |
| Mode prestataire | ❌ TODO | Packages clients |
| Moteur stratégique IA | ❌ TODO | Score simulation + recommandations |

### AI Safety
- ❌ TODO: Double validation (IA + humain)
- ❌ TODO: Audit trail immuable
- ❌ TODO: Sources vérifiables + disclaimers

---

## Architecture Existante

```
apps/green-pulse/
├── api/
│   ├── routes/
│   │   ├── workspaces/     ✅ CRUD + members
│   │   ├── projects/       ✅ CRUD + members + forms
│   │   ├── forms/          ✅ configs + instances + extract
│   │   ├── conversations/  ✅ CRUD + soft delete
│   │   ├── chat/           ✅ streaming + extract
│   │   ├── esg/            ✅ external service integration
│   │   └── upload/         ✅ audio/image/document
│   ├── models/
│   │   ├── Workspace.ts    ✅
│   │   ├── Project.ts      ✅
│   │   ├── FormConfig.ts   ✅
│   │   ├── FormInstance.ts ✅
│   │   └── Conversation.ts ✅
│   └── services/
│       ├── esg.service.ts     ✅
│       ├── openai.service.ts  ✅
│       └── gemini.service.ts  ✅
│
└── web/
    └── app/[locale]/
        ├── page.tsx           ✅ Landing
        ├── chat/              ✅ AI conversation
        ├── dashboard/         ✅ Workspace list
        └── w/[slug]/p/[id]/   ✅ Projects + Forms
```

---

## Prochaines Étapes

### Sprint 1 - Plan 1 MVP (1 semaine)
- [ ] Dashboard flouté + upgrade CTA
- [ ] Triggers keywords → modal Plan 2
- [ ] Disclaimers AI

### Sprint 2 - Plan 2 MVP (3 semaines)
- [ ] KPIs dashboard (Recharts)
- [ ] Export PDF/Excel
- [ ] Scope 1/2/3 UI
- [ ] Facteurs émission DB

### Sprint 3 - Plan 3 MVP (4 semaines)
- [ ] Multi-sites model
- [ ] Framework GRI/CSRD
- [ ] Audit upload + extraction

---

## Related Docs

- [FORMS.md](./FORMS.md) - Form templates
- [USER-WORKFLOWS.md](./USER-WORKFLOWS.md) - User journeys
- [api/docs/AI-SDK-INTEGRATION.md](./api/docs/AI-SDK-INTEGRATION.md) - AI setup
