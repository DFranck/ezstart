# 🌱 GreenPulse Forms - Architecture Agnostique avec IA

**Créé:** 26 octobre 2025
**Objectif:** Transformer le remplissage répétitif de formulaires en conversation naturelle avec l'IA

---

## 🎯 Vision du Produit

### Problème Résolu
- **Avant:** Remplir manuellement des centaines de formulaires identiques (subventions, déclarations, rapports ESG, etc.)
- **Après:** Conversation naturelle avec l'IA qui extrait et pré-remplit automatiquement les données

### User Journey

```
User ouvre /forms/solar-grant
  ↓
Option 1: Remplir manuellement (traditionnel)
Option 2: "Talk with AI" (vocal) 🎤
Option 3: "Chat with AI" (texte) 💬
  ↓
User parle/écrit naturellement
"J'ai une maison 120m², toit sud, budget 15k€, je veux 20 panneaux"
  ↓
IA extrait les données:
- Surface: 120m²
- Orientation: Sud
- Budget: 15000€
- Nombre panneaux: 20
  ↓
Mode Review: Form pré-rempli, user vérifie et valide ✅
Mode Auto: Validation et sauvegarde automatique 🚀
```

---

## 🏗️ Architecture

### Routes

```
/chat                    ✅ Existant - Conversations libres (mode chat global)
/forms                   ⭐ NOUVEAU - Dashboard des formulaires
/forms/[id]              ⭐ NOUVEAU - Interface form spécifique
/api/forms               ⭐ NOUVEAU - CRUD forms
/api/forms/[id]/extract  ⭐ NOUVEAU - Extraction IA depuis conversation
```

### Structure de Données

#### 1. Form Config (JSON Agnostique)

```typescript
// apps/green-pulse/types/src/formConfig.ts
export interface FormConfig {
  id: string
  name: string
  description: string
  category: 'grant' | 'report' | 'declaration' | 'custom'
  icon?: string

  // Extraction AI prompts
  extraction: {
    systemPrompt: string      // Instructions pour l'IA
    fields: FieldDefinition[] // Définition des champs à extraire
  }

  // Modes disponibles
  modes: {
    manual: boolean           // Remplissage manuel classique
    chat: boolean             // Chat textuel avec IA
    vocal: boolean            // Conversation vocale
    autoSubmit: boolean       // Auto-validation possible
  }

  // UI Configuration
  ui: {
    theme?: 'green' | 'blue' | 'purple'
    layout?: 'single-column' | 'two-columns' | 'wizard'
    showProgress?: boolean
    showPreview?: boolean
  }

  // Validation & Submission
  validation?: ValidationRule[]
  submitEndpoint?: string

  // Metadata
  createdBy?: string
  version?: string
  tags?: string[]
}

export interface FieldDefinition {
  id: string                  // Unique identifier
  label: string               // Human-readable label
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'boolean'
  required?: boolean

  // AI Extraction hints
  extraction: {
    keywords: string[]        // Mots-clés pour détecter la valeur
    aliases: string[]         // Variations du nom du champ
    format?: string           // Format attendu (regex, date format, etc.)
    examples?: string[]       // Exemples de valeurs valides
  }

  // Validation
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: string           // Custom validation function name
  }

  // UI
  placeholder?: string
  helpText?: string
  options?: { label: string; value: string }[] // For select fields
}
```

#### 2. Form Instance (MongoDB)

```typescript
// apps/green-pulse/api/src/models/FormInstance.ts
export interface IFormInstance {
  _id: string

  // Reference
  formConfigId: string        // ID du form config
  userId?: string             // User qui remplit

  // Data
  fields: {
    [fieldId: string]: any    // Valeurs extraites ou saisies
  }
  extractedData?: any         // Raw extraction AI (pour audit)

  // Status
  status: 'draft' | 'review' | 'submitted' | 'approved' | 'rejected'
  mode: 'manual' | 'chat' | 'vocal'

  // Conversation (si mode AI)
  conversationId?: string     // Link to Conversation model
  extractionConfidence?: {    // Confiance de l'extraction par field
    [fieldId: string]: number // 0-1
  }

  // Submission
  submittedAt?: Date
  submittedData?: any         // Final payload sent

  // Audit
  createdAt: Date
  updatedAt: Date
  history?: Array<{           // Change log
    timestamp: Date
    action: string
    userId?: string
    changes?: any
  }>
}
```

#### 3. Form Config Examples

**Exemple 1: Solar Grant Application**

```json
{
  "id": "solar-grant-2025",
  "name": "Solar Panel Installation Grant",
  "description": "Application for government solar energy grant",
  "category": "grant",
  "icon": "☀️",

  "extraction": {
    "systemPrompt": "You are helping a user fill out a solar panel installation grant application. Extract information about their property, installation plans, and budget. Be conversational and ask follow-up questions if needed.",

    "fields": [
      {
        "id": "property_surface",
        "label": "Property Surface Area (m²)",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["surface", "area", "square meters", "m²", "size"],
          "aliases": ["maison", "house", "property size"],
          "format": "number",
          "examples": ["120m²", "120 square meters", "maison de 120"]
        },
        "validation": {
          "min": 50,
          "max": 1000
        },
        "placeholder": "e.g., 120",
        "helpText": "Total surface area of your property"
      },
      {
        "id": "roof_orientation",
        "label": "Roof Orientation",
        "type": "select",
        "required": true,
        "extraction": {
          "keywords": ["orientation", "direction", "facing", "toit"],
          "aliases": ["roof direction", "orienté"],
          "examples": ["south", "sud", "north facing"]
        },
        "options": [
          { "label": "North", "value": "north" },
          { "label": "South", "value": "south" },
          { "label": "East", "value": "east" },
          { "label": "West", "value": "west" }
        ]
      },
      {
        "id": "budget",
        "label": "Budget (€)",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["budget", "cost", "price", "euros", "€"],
          "aliases": ["combien", "prix", "coût"],
          "format": "currency",
          "examples": ["15000€", "15k", "fifteen thousand euros"]
        },
        "validation": {
          "min": 5000,
          "max": 50000
        }
      },
      {
        "id": "panel_count",
        "label": "Number of Solar Panels",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["panels", "panneaux", "number", "quantity"],
          "aliases": ["combien de panneaux", "how many"],
          "examples": ["20 panels", "20 panneaux", "vingt"]
        },
        "validation": {
          "min": 5,
          "max": 100
        }
      },
      {
        "id": "installation_date",
        "label": "Planned Installation Date",
        "type": "date",
        "required": false,
        "extraction": {
          "keywords": ["when", "date", "installation", "quand"],
          "aliases": ["planned for", "prévu pour"],
          "format": "YYYY-MM-DD",
          "examples": ["next month", "in 3 months", "June 2025"]
        }
      }
    ]
  },

  "modes": {
    "manual": true,
    "chat": true,
    "vocal": true,
    "autoSubmit": false
  },

  "ui": {
    "theme": "green",
    "layout": "single-column",
    "showProgress": true,
    "showPreview": true
  },

  "validation": [
    {
      "rule": "budget_vs_panels",
      "message": "Budget seems low for the number of panels",
      "condition": "budget < (panel_count * 500)"
    }
  ],

  "submitEndpoint": "/api/grants/solar/submit",

  "tags": ["energy", "solar", "grant", "government"]
}
```

**Exemple 2: Carbon Emissions Report**

```json
{
  "id": "carbon-report-2025",
  "name": "Annual Carbon Emissions Report",
  "description": "Mandatory carbon footprint declaration for businesses",
  "category": "report",
  "icon": "🌍",

  "extraction": {
    "systemPrompt": "You are helping a business owner report their annual carbon emissions. Extract data about employees, vehicles, energy consumption, and waste. Ask clarifying questions when needed.",

    "fields": [
      {
        "id": "company_name",
        "label": "Company Name",
        "type": "text",
        "required": true,
        "extraction": {
          "keywords": ["company", "business", "organization", "entreprise"],
          "aliases": ["société", "firm"],
          "examples": ["Acme Corp", "my company", "notre entreprise"]
        }
      },
      {
        "id": "employee_count",
        "label": "Number of Employees",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["employees", "staff", "people", "employés"],
          "aliases": ["personnes", "workforce"],
          "examples": ["50 employees", "50 people", "cinquante"]
        }
      },
      {
        "id": "vehicle_count",
        "label": "Company Vehicles",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["vehicles", "cars", "fleet", "véhicules"],
          "aliases": ["voitures", "camions"],
          "examples": ["10 vehicles", "10 cars", "dix voitures"]
        }
      },
      {
        "id": "electricity_kwh",
        "label": "Monthly Electricity (kWh)",
        "type": "number",
        "required": true,
        "extraction": {
          "keywords": ["electricity", "power", "energy", "kWh", "électricité"],
          "aliases": ["consommation", "consumption"],
          "format": "number",
          "examples": ["5000 kWh/month", "5000 kilowatt-hours", "5000"]
        },
        "validation": {
          "min": 100,
          "max": 100000
        }
      },
      {
        "id": "waste_tons",
        "label": "Annual Waste (tons)",
        "type": "number",
        "required": false,
        "extraction": {
          "keywords": ["waste", "garbage", "trash", "déchets", "tons"],
          "aliases": ["tonnes", "ordures"],
          "examples": ["50 tons", "50 tonnes", "cinquante"]
        }
      }
    ]
  },

  "modes": {
    "manual": true,
    "chat": true,
    "vocal": true,
    "autoSubmit": true
  },

  "ui": {
    "theme": "blue",
    "layout": "wizard",
    "showProgress": true
  },

  "submitEndpoint": "/api/reports/carbon/submit",

  "tags": ["carbon", "emissions", "report", "mandatory"]
}
```

---

## 🔧 Technical Implementation

### Phase 1: Infrastructure (Semaine 1)

#### 1.1 Types & Models

```bash
# Créer types partagés
apps/green-pulse/types/src/formConfig.ts
apps/green-pulse/types/src/formInstance.ts

# Créer models MongoDB
apps/green-pulse/api/src/models/FormConfig.ts
apps/green-pulse/api/src/models/FormInstance.ts
```

#### 1.2 API Routes

```typescript
// apps/green-pulse/api/src/routes/forms.ts

// Form Configs (admin)
POST   /api/forms/configs              - Create form config
GET    /api/forms/configs              - List all configs
GET    /api/forms/configs/:id          - Get config by ID
PUT    /api/forms/configs/:id          - Update config
DELETE /api/forms/configs/:id          - Delete config

// Form Instances (users)
POST   /api/forms/instances            - Create form instance
GET    /api/forms/instances            - List user's instances
GET    /api/forms/instances/:id        - Get instance by ID
PUT    /api/forms/instances/:id        - Update instance
DELETE /api/forms/instances/:id        - Delete instance

// AI Extraction
POST   /api/forms/:formId/extract      - Extract data from conversation
POST   /api/forms/:instanceId/chat     - Chat with AI for this form
POST   /api/forms/:instanceId/vocal    - Vocal chat with AI

// Submission
POST   /api/forms/:instanceId/submit   - Submit completed form
```

#### 1.3 AI Extraction Service

```typescript
// apps/green-pulse/api/src/services/formExtractor.service.ts

export async function extractFormData(
  formConfig: FormConfig,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{
  extractedFields: { [fieldId: string]: any }
  confidence: { [fieldId: string]: number }
  missingFields: string[]
  suggestions: string[]
}> {
  // 1. Build extraction prompt from formConfig
  const extractionPrompt = buildExtractionPrompt(formConfig)

  // 2. Call Gemini/OpenAI with conversation history
  const response = await gemini.chat(conversationHistory, extractionPrompt)

  // 3. Parse AI response into structured data
  const extracted = parseExtractionResponse(response, formConfig.extraction.fields)

  // 4. Validate extracted data
  const validated = validateExtractedData(extracted, formConfig.extraction.fields)

  // 5. Calculate confidence scores
  const confidence = calculateConfidence(extracted, formConfig.extraction.fields)

  // 6. Identify missing required fields
  const missing = findMissingFields(extracted, formConfig.extraction.fields)

  // 7. Generate suggestions for next questions
  const suggestions = generateSuggestions(missing, formConfig.extraction.fields)

  return { extractedFields: validated, confidence, missingFields: missing, suggestions }
}
```

### Phase 2: Frontend Dashboard (Semaine 2)

#### 2.1 Dashboard `/forms`

```typescript
// apps/green-pulse/web/src/app/[locale]/forms/page.tsx

export default function FormsDashboard() {
  const { data: configs } = useQuery(['formConfigs'], fetchFormConfigs)
  const { data: instances } = useQuery(['formInstances'], fetchUserFormInstances)

  return (
    <div className="p-6">
      {/* Header with stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Forms" value={configs.length} />
        <StatsCard title="In Progress" value={instances.filter(i => i.status === 'draft').length} />
        <StatsCard title="Submitted" value={instances.filter(i => i.status === 'submitted').length} />
        <StatsCard title="Completion Rate" value="78%" />
      </div>

      {/* Available Forms */}
      <section>
        <H2>Available Forms</H2>
        <div className="grid grid-cols-3 gap-6 mt-4">
          {configs.map(config => (
            <FormCard
              key={config.id}
              config={config}
              onStart={() => router.push(`/forms/${config.id}`)}
            />
          ))}
        </div>
      </section>

      {/* My Forms (instances) */}
      <section className="mt-12">
        <H2>My Forms</H2>
        <FormInstancesList instances={instances} />
      </section>
    </div>
  )
}
```

#### 2.2 Dynamic Form `/forms/[id]`

```typescript
// apps/green-pulse/web/src/app/[locale]/forms/[id]/page.tsx

export default function FormPage({ params }: { params: { id: string } }) {
  const { data: config } = useQuery(['formConfig', params.id], () => fetchFormConfig(params.id))
  const [mode, setMode] = useState<'manual' | 'chat' | 'vocal'>('manual')
  const [instance, setInstance] = useState<IFormInstance | null>(null)

  return (
    <div className="flex h-screen">
      {/* Left: Form Preview */}
      <div className="w-1/2 p-6 overflow-y-auto">
        <H1>{config.name}</H1>
        <P>{config.description}</P>

        {/* Dynamic form fields */}
        <FormRenderer
          config={config}
          instance={instance}
          readonly={mode !== 'manual'}
        />

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button variant="primary" onClick={handleSubmit}>
            Submit
          </Button>
          <Button variant="outline" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
      </div>

      {/* Right: AI Interaction */}
      <div className="w-1/2 border-l bg-muted/50">
        {/* Mode Selector */}
        <div className="p-4 border-b flex gap-2">
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            onClick={() => setMode('manual')}
          >
            Manual
          </Button>
          {config.modes.chat && (
            <Button
              variant={mode === 'chat' ? 'default' : 'ghost'}
              onClick={() => setMode('chat')}
            >
              💬 Chat with AI
            </Button>
          )}
          {config.modes.vocal && (
            <Button
              variant={mode === 'vocal' ? 'default' : 'ghost'}
              onClick={() => setMode('vocal')}
            >
              🎤 Talk with AI
            </Button>
          )}
        </div>

        {/* AI Interface */}
        {mode === 'chat' && (
          <FormChatInterface
            formConfig={config}
            instance={instance}
            onExtract={handleExtractedData}
          />
        )}

        {mode === 'vocal' && (
          <FormVocalInterface
            formConfig={config}
            instance={instance}
            onExtract={handleExtractedData}
          />
        )}

        {mode === 'manual' && (
          <div className="p-8 text-center text-muted-foreground">
            <P>Fill the form manually or switch to AI mode</P>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Phase 3: AI Modes (Semaine 3)

#### 3.1 Chat Mode (Facebook Messenger Style)

```typescript
// apps/green-pulse/web/src/components/forms/FormChatInterface.tsx

export function FormChatInterface({
  formConfig,
  instance,
  onExtract
}: FormChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const { mutate: sendMessage } = useMutation(sendFormChatMessage)

  // Auto-extraction après chaque message
  const handleSend = async () => {
    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)

    // Send to AI
    const response = await sendMessage({
      formConfigId: formConfig.id,
      instanceId: instance?._id,
      message: input,
      conversationHistory: newMessages
    })

    // Add AI response
    setMessages([...newMessages, { role: 'assistant', content: response.aiResponse }])

    // Extract and update form
    if (response.extractedData) {
      onExtract(response.extractedData)
    }

    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        <ChatBubble role="assistant">
          {formConfig.extraction.systemPrompt}
        </ChatBubble>

        {messages.map((msg, i) => (
          <ChatBubble key={i} role={msg.role}>
            {msg.content}
          </ChatBubble>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
          />
          <Button onClick={handleSend}>Send</Button>
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 Vocal Mode (Web Speech API)

```typescript
// apps/green-pulse/web/src/components/forms/FormVocalInterface.tsx

export function FormVocalInterface({
  formConfig,
  instance,
  onExtract
}: FormVocalInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const { startRecording, stopRecording } = useSpeechRecognition()

  const handleStartVocal = async () => {
    setIsListening(true)
    const result = await startRecording()
    setTranscript(result.transcript)

    // Send to AI for extraction
    const response = await extractFromVocal({
      formConfigId: formConfig.id,
      instanceId: instance?._id,
      transcript: result.transcript
    })

    // Update form with extracted data
    onExtract(response.extractedData)

    // Speak AI response (optional)
    speak(response.aiResponse)

    setIsListening(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Microphone Button */}
      <Button
        size="lg"
        variant={isListening ? 'destructive' : 'default'}
        onClick={isListening ? stopRecording : handleStartVocal}
        className="w-32 h-32 rounded-full"
      >
        {isListening ? '🛑 Stop' : '🎤 Start'}
      </Button>

      {/* Live transcript */}
      {isListening && (
        <div className="mt-8 p-4 bg-muted rounded-lg max-w-md">
          <P className="text-sm">{transcript || 'Listening...'}</P>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 text-center text-muted-foreground max-w-md">
        <P>Click the microphone and speak naturally about your project. The AI will extract the required information automatically.</P>
      </div>
    </div>
  )
}
```

---

## 📊 Data Flow Diagrams

### Manual Mode
```
User fills form manually
  ↓
Input validation
  ↓
Save to FormInstance (status: draft)
  ↓
Submit → status: submitted
```

### Chat Mode
```
User sends message
  ↓
AI responds + extracts data
  ↓
Update FormInstance.fields
  ↓
Show preview in left panel
  ↓
User continues chat or submits
  ↓
Review mode → User validates
  ↓
Submit
```

### Vocal Mode
```
User clicks microphone
  ↓
Web Speech API records
  ↓
Transcript sent to AI
  ↓
AI extracts data + responds
  ↓
Text-to-speech response (optional)
  ↓
Update FormInstance.fields
  ↓
User validates or continues
  ↓
Submit
```

---

## 🎨 UI/UX Mockups

### Dashboard `/forms`
```
┌─────────────────────────────────────────────────┐
│  Forms Dashboard                         + New  │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Stats                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  12  │ │  3   │ │  8   │ │ 78%  │           │
│  │Total │ │Draft │ │Done  │ │Rate  │           │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                  │
│  Available Forms                                 │
│  ┌─────────────┐ ┌─────────────┐               │
│  │ ☀️ Solar    │ │ 🌍 Carbon   │               │
│  │ Grant       │ │ Report      │               │
│  │ Apply now → │ │ Fill now →  │               │
│  └─────────────┘ └─────────────┘               │
│                                                  │
│  My Forms (In Progress)                          │
│  ┌──────────────────────────────────────┐       │
│  │ Solar Grant - Draft       Edit | ❌  │       │
│  │ Started 2 days ago                    │       │
│  └──────────────────────────────────────┘       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Form Page `/forms/solar-grant`
```
┌────────────────────┬────────────────────────────┐
│  Form Preview      │  AI Assistant              │
├────────────────────┼────────────────────────────┤
│                    │  [Manual] [💬 Chat] [🎤]   │
│ ☀️ Solar Grant     │                            │
│                    │  ┌──────────────────────┐  │
│ Property Surface   │  │ Hi! I'm here to help │  │
│ [120] m²          │  │ you fill this form.  │  │
│                    │  │ Tell me about your   │  │
│ Roof Orientation   │  │ solar project!       │  │
│ [South ▼]         │  └──────────────────────┘  │
│                    │                            │
│ Budget             │  ┌──────────────────────┐  │
│ [15000] €         │  │ I have a house 120m² │  │
│                    │  │ with south roof...   │  │
│ Number of Panels   │  └──────────────────────┘  │
│ [20]              │                            │
│                    │  ┌──────────────────────┐  │
│ Installation Date  │  │ Great! I've filled:  │  │
│ [2025-06-15]      │  │ • Surface: 120m²     │  │
│                    │  │ • Orientation: South │  │
│ [Submit] [Draft]   │  │ What's your budget?  │  │
│                    │  └──────────────────────┘  │
│                    │                            │
│                    │  Type message...    [Send] │
└────────────────────┴────────────────────────────┘
```

---

## 🚀 Implementation Roadmap

### Week 1: Foundation
- [ ] Create types (FormConfig, FormInstance)
- [ ] Create MongoDB models
- [ ] Setup API routes (CRUD)
- [ ] Create 2 example configs (Solar Grant, Carbon Report)

### Week 2: Dashboard & Manual Mode
- [ ] Build `/forms` dashboard page
- [ ] Build `/forms/[id]` dynamic form page
- [ ] Implement manual form filling
- [ ] Form validation & submission

### Week 3: AI Integration
- [ ] Implement extraction service
- [ ] Build chat mode UI
- [ ] Build vocal mode UI
- [ ] Test extraction accuracy

### Week 4: Polish & Deploy
- [ ] Review mode (confidence scores, validation)
- [ ] Auto-submit mode
- [ ] Analytics & reporting
- [ ] Deploy to production

---

## 🔐 Security & Privacy

- [ ] User data encryption at rest
- [ ] Form data isolated per user
- [ ] Conversation history stored securely
- [ ] GDPR compliance (data deletion)
- [ ] Audit logs for submissions

---

## 📈 Success Metrics

- **Time saved:** Measure avg time to fill form (manual vs AI)
- **Completion rate:** % of started forms that get submitted
- **Extraction accuracy:** % of fields correctly extracted
- **User satisfaction:** NPS survey after submission
- **Adoption rate:** % of users who use AI mode vs manual

---

## 🎯 Next Steps

1. Review & validate this design document
2. Create TODO list for implementation
3. Setup development environment
4. Start Phase 1: Infrastructure

**Questions to answer:**
- Quelle plateforme AI utiliser ? (Gemini, OpenAI, Claude)
- Faut-il un système de templates de forms ? (admin UI pour créer configs)
- Faut-il supporter plusieurs langues ? (i18n)
- Faut-il un système de permissions ? (qui peut voir/éditer quels forms)