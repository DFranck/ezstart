# 🚀 GreenPulse Forms - Quick Start

**Backend 100% Complet ✅** | **Frontend À Faire ⏳**

---

## ⚡ TL;DR

**Ce qui existe :**
- ✅ API complète (18 endpoints)
- ✅ Extraction IA avec Gemini
- ✅ Multi-user/Multi-projet
- ✅ 4 formulaires seed

**Ce qui manque :**
- ⏳ Pages Next.js
- ⏳ Components React
- ⏳ Interface IA (chat/vocal)

---

## 📂 Structure Backend

```
apps/green-pulse/
├── types/src/
│   ├── formConfig.ts       ✅ Template formulaire
│   ├── formInstance.ts     ✅ Formulaire rempli
│   └── project.ts          ✅ Projet multi-user
├── api/src/
│   ├── models/
│   │   ├── FormConfig.ts   ✅ MongoDB model
│   │   ├── FormInstance.ts ✅ MongoDB model
│   │   └── Project.ts      ✅ MongoDB model
│   ├── routes/
│   │   ├── forms.ts        ✅ 10 endpoints
│   │   └── projects.ts     ✅ 8 endpoints
│   ├── services/
│   │   └── formExtractor.service.ts  ✅ Extraction IA
│   ├── seeds/
│   │   └── formConfigs.ts  ✅ 4 forms
│   └── scripts/
│       └── seedForms.ts    ✅ Script seed
└── web/
    └── src/app/[locale]/
        ├── forms/          ⏳ À créer
        ├── projects/       ⏳ À créer
        └── components/     ⏳ À créer
```

---

## 🔌 API Endpoints

### Forms
```
GET    /api/forms/configs              # Templates
GET    /api/forms/configs/:id
POST   /api/forms/configs

GET    /api/forms/instances            # Instances
GET    /api/forms/instances/:id
POST   /api/forms/instances
PUT    /api/forms/instances/:id
POST   /api/forms/instances/:id/submit
DELETE /api/forms/instances/:id

POST   /api/forms/extract              # ⭐ Extraction IA
```

### Projects
```
GET    /api/projects                   # Projets
GET    /api/projects/:id
POST   /api/projects
PUT    /api/projects/:id
DELETE /api/projects/:id

POST   /api/projects/:id/members       # Permissions
PUT    /api/projects/:id/members/:uid
DELETE /api/projects/:id/members/:uid

GET    /api/projects/:id/forms         # Forms projet
```

---

## 🎯 Seed Database

```bash
cd apps/green-pulse/api
pnpm seed:forms
```

**Formulaires créés :**
1. 🏢 Company Inspection (10 champs)
2. ☀️ Solar Grant (5 champs)
3. 🌍 Carbon Report (5 champs)
4. ♻️ Waste Reduction (4 champs)

---

## 🧪 Test Extraction IA

```bash
curl -X POST http://localhost:5070/api/forms/extract \
  -H "Content-Type: application/json" \
  -d '{
    "formConfigId": "company-inspection-2025",
    "conversationHistory": [
      {
        "role": "user",
        "content": "Je visite ABC Corp à Paris, 50 employés, secteur tech"
      }
    ]
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "extractedFields": {
      "company_name": "ABC Corp",
      "company_address": "Paris",
      "employee_count": 50,
      "company_sector": "technology"
    },
    "confidence": {
      "company_name": 0.95,
      "company_address": 0.70,
      "employee_count": 0.90,
      "company_sector": 0.85
    },
    "missingFields": ["contact_name", "inspection_date"],
    "suggestions": [
      "Who did you meet with?",
      "When was the inspection?"
    ],
    "aiResponse": "Great! I've noted ABC Corp in Paris..."
  }
}
```

---

## 📋 Frontend À Créer

### Pages

**1. `/forms` - Dashboard Global**
```tsx
- Liste tous les projets (owned + shared)
- Stats : total, drafts, submitted, completion rate
- Bouton "+ New Project"
- Filtres : status, tags
```

**2. `/projects/[id]` - Projet Détail**
```tsx
- Info entreprise visitée
- Liste membres avec permissions
- Liste forms du projet (table avec statuts)
- Bouton "Add Form from Template"
```

**3. `/forms/[id]` - Split-Screen Fill**
```tsx
Left:  Form preview (readonly ou manual)
Right: AI interface (tabs: manual, chat, vocal)

Modes:
- Manual: Remplissage classique
- Chat:   Conversation textuelle avec IA
- Vocal:  Conversation vocale (Web Speech API)
```

### Components Clés

**FormChatInterface**
```tsx
- Messages chat (bubbles)
- Input + Send button
- Auto-extraction après chaque message
- Update form en temps réel
```

**FormVocalInterface**
```tsx
- Bouton microphone (rond 🎤)
- Live transcript
- Web Speech API
- Text-to-speech réponses
```

**FormRenderer**
```tsx
- Rendu dynamique des champs depuis config
- Support tous les types: text, number, date, select, textarea
- Validation rules
- Confidence scores (couleur orange si < 0.8)
```

---

## 🔧 Stack Technique

**Backend :**
- Express + MongoDB (factory pattern)
- Zod schemas
- OpenAPI documentation
- Gemini AI (extraction)

**Frontend (À Utiliser) :**
- Next.js 14 (App Router)
- React Query (@tanstack/react-query)
- Components @ezstart/ui
- Web Speech API (vocal)

---

## 📚 Docs Complètes

- **Design :** [FORMS-DESIGN.md](./FORMS-DESIGN.md)
- **Implementation :** [FORMS-IMPLEMENTATION.md](./FORMS-IMPLEMENTATION.md)
- **Monorepo Rules :** [../../CLAUDE.md](../../CLAUDE.md)

---

## 🚀 Prochaines Étapes

1. **Créer les 3 pages** (forms, projects, forms/[id])
2. **Implémenter FormChatInterface**
3. **Implémenter FormVocalInterface**
4. **Connecter extraction API**
5. **Polish UI/UX**

**Temps estimé :** 2-3 semaines

---

**Créé :** 26 octobre 2025
**Status :** Backend ready, Frontend en attente
