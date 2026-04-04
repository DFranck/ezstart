# 📝 GreenPulse Forms - Intelligent Form System

**Status:** Backend 100% complet ✅ | Frontend 30% complet ⏳

---

## 🎯 Overview

**Use Case:** Inspecteurs/prestataires visitant plusieurs entreprises avec formulaires répétitifs.

**Innovation:**

- ✅ 100% Agnostique (formulaires définis via JSON config)
- ✅ Multi-User/Multi-Projet (partage et permissions)
- ✅ 3 Modes de remplissage (Manuel, Chat textuel IA, Vocal IA)
- ✅ Extraction intelligente (Gemini AI extrait données de conversations naturelles)

---

## 🏗️ Architecture

### Backend (100% Complet ✅)

**Types TypeScript:**

```typescript
FormConfig // Template de formulaire (champs, extraction hints, UI)
FormInstance // Formulaire rempli lié à un projet
Project // Dossier/cas avec membres et permissions
ProjectMember // User avec role (owner/editor/viewer)
```

**Models MongoDB:**

```typescript
getFormConfigModel() // Templates de formulaires
getFormInstanceModel() // Formulaires remplis
getProjectModel() // Projets/dossiers
```

**Routes API:**

```
POST   /api/forms/configs           # Create template
GET    /api/forms/configs           # List templates
GET    /api/forms/configs/:id       # Get template

POST   /api/forms/instances         # Create instance
GET    /api/forms/instances         # List instances
GET    /api/forms/instances/:id     # Get instance
PATCH  /api/forms/instances/:id     # Update instance

POST   /api/forms/extract           # ⭐ AI Extraction

POST   /api/projects                # Create project
GET    /api/projects                # List projects
GET    /api/projects/:id            # Get project
POST   /api/projects/:id/members    # Add member
GET    /api/projects/:id/forms      # List project forms
```

### Service d'Extraction IA

**Location:** `apps/green-pulse/api/src/services/formExtractor.service.ts`

```typescript
extractFormData(formConfigId, conversationHistory)
  → {
    extractedFields,     // Données extraites par IA
    confidence,          // Score de confiance (0-1)
    missingFields,       // Champs manquants
    suggestions,         // Suggestions pour compléter
    aiResponse          // Message conversationnel
  }
```

---

## 📋 Formulaires Seed Disponibles

### 1. Company Inspection Form 🏢 (USE CASE PRINCIPAL)

**Champs (10):**

- company_name (text, required)
- company_address (text, required)
- company_sector (select, required)
- employee_count (number, required)
- contact_person (text)
- contact_email (email)
- inspection_date (date, required)
- inspection_notes (textarea)
- compliance_status (select)
- follow_up_required (checkbox)

**Usage:** Inspecteurs visitant plusieurs entreprises

### 2. Solar Grant Application ☀️

**Champs (5):**

- property_address
- roof_orientation (select: North/South/East/West)
- installation_budget (number)
- panel_count (number)
- installation_date (date)

### 3. Carbon Emissions Report 🌍

**Champs (5):**

- company_name
- employee_count
- vehicle_count
- electricity_consumption (kWh/month)
- waste_production (kg/month)

### 4. Waste Reduction Plan ♻️

**Champs (4):**

- current_waste_amount (kg/month)
- target_reduction_percentage
- implementation_timeline (months)
- planned_actions (textarea)

### Seed Database

```bash
cd apps/green-pulse/api
pnpm seed:forms
```

---

## 🚀 Workflow Exemple

### Inspecteur Use Case

```
1. Ouvre /forms dashboard
   ↓
2. Crée nouveau projet "Inspection ABC Corp"
   - Sélectionne template: Company Inspection Form
   ↓
3. Page /forms/{id} - Mode chat activé
   - Parle naturellement: "Je visite ABC Corp à Paris, 50 employés"
   ↓
4. AI extrait automatiquement:
   - company_name: "ABC Corp" (confidence: 0.95)
   - company_address: "Paris" (confidence: 0.70) ⚠️
   - employee_count: 50 (confidence: 0.90)
   ↓
5. Form se pré-remplit automatiquement
   - Champs avec confidence < 0.8 en orange pour vérification
   ↓
6. Inspecteur valide et submit
   ↓
7. Partage projet avec collègue (role: editor)
```

---

## 💻 Frontend (À Implémenter ⏳)

### Pages

**Dashboard (/forms):**

- Liste tous projets
- Filtres (status, date, assigné)
- Création nouveau projet

**Project Detail (/projects/[id]):**

- Liste forms du projet
- Membres du projet
- Timeline d'activité

**Form Filling (/forms/[id]):**

- Split-screen: Form + AI interface
- 3 modes: Manual, Chat, Vocal
- Real-time validation

### Components

**FormChatInterface:**

```tsx
<FormChatInterface
  formConfigId="company-inspection"
  onFieldsExtracted={fields => setFormData(fields)}
/>
```

**FormVocalInterface:**

```tsx
<FormVocalInterface formConfigId="company-inspection" onTranscript={text => sendToAI(text)} />
```

**FormRenderer:**

```tsx
<FormRenderer
  config={formConfig}
  data={formData}
  onChange={(field, value) => handleChange(field, value)}
  highlightLowConfidence={true}
/>
```

**ProjectCard:**

```tsx
<ProjectCard project={project} stats={{ total: 5, completed: 2 }} members={members} />
```

---

## 🤖 AI Extraction Configuration

### Example Form Config (JSON)

```json
{
  "id": "company-inspection-2025",
  "name": "Company Inspection Form",
  "category": "report",

  "extraction": {
    "systemPrompt": "You are helping an inspector fill out company information...",
    "fields": [
      {
        "id": "company_name",
        "label": "Company Name",
        "type": "text",
        "required": true,
        "extraction": {
          "keywords": ["company", "business", "entreprise"],
          "examples": ["ABC Corp", "Acme Industries"]
        }
      },
      {
        "id": "employee_count",
        "label": "Number of Employees",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["employees", "employés", "staff"],
          "examples": ["50 employees", "team of 20"]
        }
      }
    ]
  },

  "modes": {
    "manual": true,
    "chat": true,
    "vocal": true,
    "autoSubmit": false
  }
}
```

### Extraction Flow

```
User: "Je visite ABC Corp à Paris, 50 employés"
  ↓
AI extracts:
  {
    "company_name": { value: "ABC Corp", confidence: 0.95 },
    "company_address": { value: "Paris", confidence: 0.70 },
    "employee_count": { value: 50, confidence: 0.90 }
  }
  ↓
Form auto-fills with confidence colors:
  - Green (>0.8): High confidence ✅
  - Orange (0.5-0.8): Medium confidence ⚠️
  - Red (<0.5): Low confidence ❌
```

---

## 📊 Roadmap

### Phase 1: Frontend Basic (Semaines 1-2)

- [ ] Pages dashboard, project detail, form filling
- [ ] Composants de base: ProjectCard, FormRow, FormRenderer
- [ ] Navigation et routing

### Phase 2: AI Integration (Semaine 3)

- [ ] FormChatInterface avec extraction API
- [ ] Real-time form updates
- [ ] Confidence scores display

### Phase 3: Vocal & Polish (Semaine 4)

- [ ] FormVocalInterface avec Web Speech API
- [ ] Text-to-speech responses
- [ ] Mobile responsive

### Phase 4: Multi-User (Semaine 5)

- [ ] Permissions UI + Share dialog
- [ ] Real-time collaboration (Socket.IO)
- [ ] Activity timeline

---

## 🧪 Testing

### Backend Tests

```bash
cd apps/green-pulse/api
pnpm test

# Test extraction
pnpm test formExtractor.service.test.ts
```

### Manual Testing

```bash
# 1. Seed forms
pnpm seed:forms

# 2. Test extraction API
curl -X POST http://localhost:6160/api/forms/extract \
  -H "Content-Type: application/json" \
  -d '{
    "formConfigId": "company-inspection-2025",
    "conversationHistory": [
      { "role": "user", "content": "Je visite ABC Corp à Paris" }
    ]
  }'
```

---

## 🔑 Environment Variables

### Gemini AI Setup

```env
# apps/green-pulse/api/.env.local
GEMINI_API_KEY=your_api_key_here
```

**Get API Key:**

1. Go to https://ai.google.dev/
2. Create project
3. Enable Gemini API
4. Generate API key

**Documentation:** [api/GEMINI-SETUP.md](./api/GEMINI-SETUP.md)

---

## 📚 References

- **API README:** [api/README.md](./api/README.md)
- **Web README:** [web/README.md](./web/README.md)
- **React Query Guide:** [web/docs/REACT-QUERY.md](./web/docs/REACT-QUERY.md)
- **Main README:** [README.md](./README.md)
