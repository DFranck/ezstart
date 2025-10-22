# 🌱 GreenPulse - Roadmap Tech Cloud

**Status:** 📝 Beta Preparation
**Last Updated:** 2025-10-22
**Owner:** Tech Cloud Team

---

## 📊 Vue d'Ensemble

Roadmap complète pour transformer GreenPulse en produit beta-testable avec authentification, privacy et UX professionnelle.

**Total Tasks:** 10 phases
**Estimation Totale:** ~21 heures
**Target Launch:** 2 semaines

---

## Phase 1: Branding & Assets 🎨

### ✅ TODO: Logo & Favicon - Pulse Vert

**Objectif:** Remplacer logo/favicon actuel par un pulse/heartbeat vert cohérent avec l'identité GreenPulse.

**Tasks:**
- [ ] Créer logo avec pulse/heartbeat vert (#10b981)
- [ ] Générer tous les assets PWA
  - [ ] `public/logo.png`
  - [ ] `public/favicon.png`
  - [ ] `public/apple-touch-icon.png`
  - [ ] `public/icons/icon-192x192.png`
  - [ ] `public/icons/icon-512x512.png`
- [ ] Créer `og-image.svg` avec nouveau logo
- [ ] Tester affichage sur mobile/desktop/PWA

**Priorité:** HIGH
**Estimation:** 2-3 heures

**Fichiers à modifier:**
- `apps/green-pulse/web/public/logo.png`
- `apps/green-pulse/web/public/favicon.png`
- `apps/green-pulse/web/public/apple-touch-icon.png`
- `apps/green-pulse/web/public/icons/*`
- `apps/green-pulse/web/public/og-image.svg`

**Critères d'acceptation:**
- Logo cohérent avec thème vert #10b981
- PWA installe avec bon logo
- Tous navigateurs affichent bon favicon

---

## Phase 2: Infrastructure & Domaine 🌐

### ✅ TODO: Sous-domaine .app pour chat

**Objectif:** Créer un sous-domaine dédié pour le chat IA (`chat.ai-greenpulse.com`).

**Tasks:**
- [ ] Configurer DNS chez provider
  - [ ] CNAME: `chat` → `cname.vercel-dns.com`
- [ ] Ajouter custom domain dans Vercel
- [ ] Mettre à jour config URLs
  - [ ] `packages/config/src/urls.ts` - Ajouter chat domain
- [ ] Configurer redirects/rewrites
  - [ ] `apps/green-pulse/web/vercel.json`
- [ ] Tester SSL et routing

**Priorité:** MEDIUM
**Estimation:** 1 heure

**Fichiers à modifier:**
```typescript
// packages/config/src/urls.ts
'green-pulse': {
  web: {
    production: 'https://www.ai-greenpulse.com',
    chat: 'https://chat.ai-greenpulse.com', // NEW
  }
}
```

**Critères d'acceptation:**
- `chat.ai-greenpulse.com` accessible
- SSL valide (HTTPS)
- Redirect `/chat` depuis main domain

---

## Phase 3: Sécurité & Privacy 🔒

### ✅ TODO: Supprimer enregistrement chats anonymes

**Objectif:** Empêcher toute conversation sans authentification. Supprimer historique test.

**Tasks:**
- [ ] **API: Bloquer création sans userId**
  - [ ] `apps/green-pulse/api/src/routes/chat.ts:38-52` - Supprimer auto-création
  - [ ] Retourner 401 si pas de userId dans token
- [ ] **DB: Nettoyer conversations anonymes**
  ```javascript
  // Migration script
  db.conversations.deleteMany({ userId: null })
  db.conversations.deleteMany({ userId: { $regex: /^lia_/ } }) // Session IDs
  ```
- [ ] **Query filter: TOUJOURS par userId**
  - [ ] `apps/green-pulse/api/src/routes/conversations.ts:26` - Ajouter `query.userId = req.user.id`
- [ ] **Tester isolation conversations**
  - [ ] User A ne peut pas voir conversations User B
  - [ ] API 403 si tentative accès conversation autre user

**Priorité:** 🔴 CRITICAL
**Estimation:** 2 heures

**Fichiers à modifier:**
- `apps/green-pulse/api/src/routes/chat.ts` - Ligne 38-52 (supprimer auto-create)
- `apps/green-pulse/api/src/routes/conversations.ts` - Ligne 26 (add userId filter)
- Créer: `apps/green-pulse/api/scripts/cleanup-anonymous.js` (migration)

**Critères d'acceptation:**
- ❌ Impossible créer conversation sans auth
- ✅ Toutes conversations ont userId valide
- ✅ User A ne voit que ses conversations
- ✅ API retourne 401/403 si accès non autorisé

---

### ✅ TODO: Brancher authentification + email verification

**Objectif:** Intégrer EZAuth SSO et bloquer chat si email non vérifié.

**Tasks:**
- [ ] **Middleware auth sur `/chat`**
  - [ ] Créer: `apps/green-pulse/web/src/middleware.ts`
  - [ ] Vérifier JWT token EZAuth
  - [ ] Redirect `/auth/login` si non authentifié
- [ ] **Bloquer si email non vérifié**
  - [ ] Vérifier `user.emailVerified` depuis token
  - [ ] Afficher banner "Verify your email to chat"
  - [ ] Bouton "Resend verification email"
- [ ] **Lier userId à conversations**
  - [ ] Extract userId depuis JWT
  - [ ] Pass dans header `Authorization: Bearer <token>`
  - [ ] API valide token et récupère userId
- [ ] **UI states**
  - [ ] Loading: "Checking authentication..."
  - [ ] Unauthenticated: "Sign in to chat"
  - [ ] Email not verified: "Please verify your email"
  - [ ] Ready: Show chat interface

**Priorité:** 🔴 CRITICAL
**Estimation:** 3 heures

**Fichiers à créer/modifier:**
- Créer: `apps/green-pulse/web/src/middleware.ts`
- Créer: `apps/green-pulse/web/src/components/auth/VerifyEmailBanner.tsx`
- Modifier: `apps/green-pulse/web/src/app/[locale]/chat/page.tsx`
- Modifier: `apps/green-pulse/api/src/routes/chat.ts` (validate token)

**Code Example:**
```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  try {
    const user = await verifyToken(token)
    if (!user.emailVerified) {
      return NextResponse.redirect(new URL('/auth/verify-email', req.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }
}

export const config = {
  matcher: ['/chat/:path*']
}
```

**Critères d'acceptation:**
- ✅ Impossible accéder `/chat` sans auth
- ✅ Email non vérifié → banner + bloquer chat
- ✅ Toutes conversations liées à userId
- ✅ Token JWT validé côté API

---

## Phase 4: UI/UX Chat 🎨

### ✅ TODO: Refonte UI Chat

**Objectif:** Design minimaliste et professionnel avec branding GreenPulse.

**Tasks:**
- [ ] **Header Chat**
  - [ ] Logo GreenPulse coin supérieur gauche (cliquable → home)
  - [ ] Bouton "Sign Up" coin supérieur droit (si non auth)
  - [ ] User avatar + menu dropdown (si auth)
- [ ] **Formulaire Contact**
  - [ ] Modal "Contact & Info"
  - [ ] Sections: Pricing, Features, Data Protection
  - [ ] Form: Name, Email, Message
  - [ ] Submit → Email à l'équipe
- [ ] **Styling Messages**
  - [ ] Fond conversation: `bg-stone-50` (blanc cassé)
  - [ ] Blocs user prompts: `bg-green-500/10` (vert faible opacité)
  - [ ] Blocs IA response: `bg-card`
  - [ ] Padding/spacing cohérent
- [ ] **Composants UI**
  - [ ] Utiliser `@ezstart/ui` components (Card, Button, etc.)
  - [ ] Classes sémantiques (pas de couleurs hardcodées)
  - [ ] Dark mode support

**Priorité:** HIGH
**Estimation:** 4 heures

**Fichiers à créer/modifier:**
- Créer: `apps/green-pulse/web/src/components/chat/ChatHeader.tsx`
- Créer: `apps/green-pulse/web/src/components/chat/ContactModal.tsx`
- Créer: `apps/green-pulse/web/src/components/chat/ChatLayout.tsx`
- Modifier: `apps/green-pulse/web/src/components/lia/LiaThread.tsx`

**Design Reference:**
```tsx
<ChatLayout>
  <ChatHeader
    logo={<Image src="/logo.png" />}
    actions={
      user ? <UserMenu /> : <Button>Sign Up</Button>
    }
  />

  <ThreadMessages
    className="bg-stone-50 dark:bg-stone-900"
    userMessageClass="bg-green-500/10"
    aiMessageClass="bg-card"
  />

  <ChatFooter>
    <ThreadComposer />
    <Button onClick={openContactModal}>Contact & Info</Button>
  </ChatFooter>
</ChatLayout>
```

**Critères d'acceptation:**
- ✅ Logo visible et cliquable
- ✅ Bouton Sign Up/User menu fonctionnel
- ✅ Modal contact avec form working
- ✅ Messages styled avec couleurs correctes
- ✅ Design responsive (mobile + desktop)

---

### ✅ TODO: Images réseaux sociaux (OG)

**Objectif:** Générer OG images pour partage sur Twitter/LinkedIn/Facebook.

**Tasks:**
- [ ] **Créer assets**
  - [ ] `og-chat.png` (1200x630) - Page chat
  - [ ] `og-home.png` (1200x630) - Homepage
  - [ ] Design avec logo + tagline
- [ ] **Metadata**
  - [ ] Mettre à jour `layout.tsx` avec OG tags
  - [ ] Twitter card: `summary_large_image`
- [ ] **Tester preview**
  - [ ] Twitter Card Validator
  - [ ] LinkedIn Post Inspector
  - [ ] Facebook Sharing Debugger

**Priorité:** MEDIUM
**Estimation:** 1 heure

**Fichiers à créer/modifier:**
- Créer: `apps/green-pulse/web/public/og-chat.png`
- Créer: `apps/green-pulse/web/public/og-home.png`
- Modifier: `apps/green-pulse/web/src/app/[locale]/chat/layout.tsx`

**Code Example:**
```typescript
// chat/layout.tsx
export const metadata = {
  title: 'GreenPulse Chat - AI Sustainability Assistant',
  description: 'Chat with LIA for ESG reporting and carbon tracking',
  openGraph: {
    title: 'GreenPulse Chat - AI Sustainability Assistant',
    description: 'Track and improve your environmental impact with AI',
    images: [
      {
        url: 'https://www.ai-greenpulse.com/og-chat.png',
        width: 1200,
        height: 630,
        alt: 'GreenPulse Chat',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GreenPulse Chat',
    description: 'AI-powered sustainability assistant',
    images: ['https://www.ai-greenpulse.com/og-chat.png'],
  }
}
```

**Critères d'acceptation:**
- ✅ OG images affichées sur tous réseaux
- ✅ Preview correct (title + description + image)
- ✅ Image 1200x630 (spec OG)

---

## Phase 5: IA Fixes 🤖

### ✅ TODO: Bug compréhension prompts

**Objectif:** Améliorer lisibilité des réponses IA (moins de markdown, meilleur style).

**Tasks:**
- [ ] **Fix markdown excessif (`**`)**
  - [ ] Modifier system prompt: "Use markdown sparingly"
  - [ ] Post-processing: Strip excessive `**`
- [ ] **Améliorer system prompt**
  ```typescript
  const SYSTEM_PROMPT_GENERAL = `You are GreenPulse.AI, an ESG advisor.

  Response Style:
  - Write in clear, conversational text
  - Use markdown ONLY for:
    • Lists (bullet points)
    • Emphasis (single words, not every word)
    • Code blocks (if technical)
  - NEVER wrap every sentence in bold
  - Structure responses with paragraphs, not walls of bold text

  Your goal is readability, not markdown complexity.`
  ```
- [ ] **Limiter context window**
  - [ ] Garder seulement 20 derniers messages
  - [ ] Éviter dépassement token limit
- [ ] **Tester prompts complexes**
  - [ ] "Explain carbon footprint calculation"
  - [ ] "List 10 sustainability tips"
  - [ ] "Analyze this ESG report: [long text]"

**Priorité:** HIGH
**Estimation:** 2 heures

**Fichiers à modifier:**
- `apps/green-pulse/api/src/services/gemini.service.ts` - Ligne 8-10 (system prompt)
- `apps/green-pulse/api/src/routes/chat.ts` - Ligne 61-68 (limit history)

**Code Example:**
```typescript
// chat.ts - Limit conversation history
if (conversation && conversation.messages) {
  conversationHistory = conversation.messages
    .slice(-20) // Keep last 20 messages only
    .map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))
}
```

**Critères d'acceptation:**
- ✅ Réponses lisibles (pas de `**` excessif)
- ✅ Markdown utilisé seulement pour listes/emphasis
- ✅ Context window limité (pas d'erreur token)
- ✅ Prompts complexes fonctionnent

---

### ✅ TODO: Bug lors de l'édition

**Objectif:** Fixer le bug d'édition de message qui cause des erreurs ou double-send.

**Tasks:**
- [ ] **Analyser le bug**
  - [ ] Reproduire: Edit message → Error/Double response
  - [ ] Identifier race condition
- [ ] **Fix editMessage()**
  ```typescript
  // LiaThread.tsx
  const handleEdit = async (messageId: string, newContent: string) => {
    // 1. Find message index
    const messageIndex = messages.findIndex(m => m.id === messageId)

    // 2. Update message locally
    const updatedMessages = messages.slice(0, messageIndex + 1)
    updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: newContent }

    // 3. Clear messages after edited one
    clearMessages()
    loadMessages(updatedMessages)

    // 4. Resend from edited message
    await sendMessage(newContent)
  }
  ```
- [ ] **Empêcher double-send**
  - [ ] Ajouter flag `isEditing` dans state
  - [ ] Disable composer pendant edit
  - [ ] Annuler pending request si edit triggered
- [ ] **Regénérer conversation**
  - [ ] Backend: Rebuild history depuis message édité
  - [ ] Frontend: Clear messages après edit, puis reload

**Priorité:** HIGH
**Estimation:** 2 heures

**Fichiers à modifier:**
- `apps/green-pulse/web/src/components/lia/LiaThread.tsx` - handleEdit function
- `apps/green-pulse/web/src/components/lia/ThreadProvider.tsx` - editMessage logic
- Potentiellement: `@ezstart/ui/hooks/useThreadAPI.ts` (si bug dans hook)

**Critères d'acceptation:**
- ✅ Edit message fonctionne sans erreur
- ✅ Pas de double-send à l'API
- ✅ Conversation régénérée depuis message édité
- ✅ UI disable pendant processing

---

## Phase 6: Beta Testing & Analytics 📊

### ✅ TODO: Utilisation seulement si sign in

**Objectif:** Forcer authentification pour utiliser le chat.

**Tasks:**
- [ ] **Middleware redirect**
  - [ ] Route `/chat` → Check auth
  - [ ] Si non auth → Redirect `/auth/login?redirect=/chat`
- [ ] **API: Bloquer sans token**
  - [ ] `POST /api/chat` → Vérifier header `Authorization`
  - [ ] Retourner 401 si token manquant/invalide
- [ ] **UI message public**
  - [ ] Landing page: "Sign in to chat with LIA"
  - [ ] CTA button: "Get Started" → Login/Signup

**Priorité:** 🔴 CRITICAL
**Estimation:** 1 heure

**Fichiers à modifier:**
- `apps/green-pulse/web/src/middleware.ts` (déjà créé phase 3)
- `apps/green-pulse/api/src/routes/chat.ts` - Add auth middleware
- `apps/green-pulse/web/src/app/[locale]/page.tsx` - Update CTA

**Code Example:**
```typescript
// api/routes/chat.ts
import { authenticateToken } from '@ezstart/express-core'

docRouter.post('/', authenticateToken, async (req, res) => {
  const userId = req.user.id // From token
  // ... rest of chat logic
})
```

**Critères d'acceptation:**
- ✅ Impossible utiliser chat sans auth
- ✅ API retourne 401 si pas de token
- ✅ Redirect flow fonctionne (login → back to chat)

---

### ✅ TODO: Tracking & historique beta testeurs

**Objectif:** Logger toutes les interactions pour analyse beta testing.

**Tasks:**
- [ ] **Créer model UsageLog**
  ```typescript
  // apps/green-pulse/api/src/models/UsageLog.ts
  {
    userId: string,
    event: 'message_sent' | 'conversation_created' | 'edit_message' | 'delete_conversation',
    timestamp: Date,
    metadata: {
      messageLength?: number,
      responseTime?: number,
      modelUsed: string,
      conversationId?: string,
      error?: string
    }
  }
  ```
- [ ] **Logger dans API**
  - [ ] POST /api/chat → Log `message_sent`
  - [ ] POST /api/conversations → Log `conversation_created`
  - [ ] PATCH /api/conversations/:id → Log `edit_message`
- [ ] **Dashboard admin**
  - [ ] Route: `/admin/beta-stats`
  - [ ] Métriques:
    - Active users (last 7 days)
    - Total messages sent
    - Avg messages/user
    - Avg session time
    - Error rate
  - [ ] Graphiques: Messages/day, Users/day
  - [ ] Table: Top users by usage
- [ ] **Export CSV**
  - [ ] Button "Export Beta Data"
  - [ ] Format: userId, event, timestamp, metadata
  - [ ] Useful pour analyse externe

**Priorité:** MEDIUM
**Estimation:** 3 heures

**Fichiers à créer:**
- `apps/green-pulse/api/src/models/UsageLog.ts`
- `apps/green-pulse/api/src/routes/analytics.ts`
- `apps/green-pulse/web/src/app/[locale]/admin/beta-stats/page.tsx`

**Code Example:**
```typescript
// analytics.ts - Dashboard endpoint
docRouter.get('/beta-stats', authenticateAdmin, async (req, res) => {
  const stats = await UsageLog.aggregate([
    { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
    { $group: {
      _id: '$event',
      count: { $sum: 1 },
      uniqueUsers: { $addToSet: '$userId' }
    }}
  ])

  res.json({ success: true, data: stats })
})
```

**Critères d'acceptation:**
- ✅ Tous events loggés dans DB
- ✅ Dashboard affiche métriques correct
- ✅ Export CSV fonctionne
- ✅ Admin-only access (protégé)

---

## 📈 Progress Tracking

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| Phase 1: Branding | 📝 Todo | 0% | - |
| Phase 2: Domaine | 📝 Todo | 0% | - |
| Phase 3: Security | 📝 Todo | 0% | - |
| Phase 4: UI/UX | 📝 Todo | 0% | - |
| Phase 5: IA Fixes | 📝 Todo | 0% | - |
| Phase 6: Analytics | 📝 Todo | 0% | - |

**Legend:**
- 📝 Todo
- 🔄 In Progress
- ✅ Done
- ⏸️ Blocked
- ❌ Cancelled

---

## 🎯 Priorités

### 🔴 Critical (Launch Blockers)
1. Phase 3: Sécurité & Privacy
2. Phase 6: Auth forcée
3. Phase 5: Bug edit message

### 🟡 High (Beta Quality)
1. Phase 4: UI Chat refonte
2. Phase 5: Bug compréhension prompts
3. Phase 1: Branding

### 🟢 Medium (Nice to Have)
1. Phase 2: Sous-domaine .app
2. Phase 4: OG images
3. Phase 6: Dashboard analytics

---

## 🚀 Ordre d'Exécution Recommandé

1. **Semaine 1: Core Security & UX**
   - Day 1-2: Phase 3 (Security + Auth) ← CRITICAL
   - Day 3-4: Phase 5 (IA Fixes) ← CRITICAL
   - Day 5: Phase 4 (UI Chat refonte) ← HIGH

2. **Semaine 2: Polish & Analytics**
   - Day 6: Phase 1 (Branding) ← HIGH
   - Day 7-8: Phase 6 (Analytics) ← MEDIUM
   - Day 9: Phase 2 (Sous-domaine) + Phase 4 (OG images) ← MEDIUM
   - Day 10: Testing complet + Fixes

---

## ✅ Testing Checklist

### Pre-Launch Tests
- [ ] **Auth Flow**
  - [ ] Sign up → Email verification → Access chat
  - [ ] Login → Redirect to chat
  - [ ] Logout → Redirect to home
- [ ] **Chat Functionality**
  - [ ] Send message → IA response
  - [ ] Edit message → Regénération conversation
  - [ ] Delete conversation → Confirmation + Suppression
- [ ] **Privacy**
  - [ ] User A ne voit pas conversations User B
  - [ ] Conversations anonymes n'existent plus
  - [ ] API refuse requests sans token
- [ ] **UI/UX**
  - [ ] Logo visible et cliquable
  - [ ] Contact modal fonctionne
  - [ ] Messages styled correctement
  - [ ] Responsive mobile + desktop
- [ ] **Analytics**
  - [ ] Events loggés dans DB
  - [ ] Dashboard affiche stats
  - [ ] Export CSV fonctionne

### Performance Tests
- [ ] Chat latency < 3s (Gemini response)
- [ ] Page load < 2s
- [ ] No memory leaks (long sessions)

### Security Tests
- [ ] JWT token validation works
- [ ] Email verification enforced
- [ ] CORS configured correctly
- [ ] No SQL injection possible

---

## 📝 Notes Techniques

### Migrations DB Nécessaires

```javascript
// 1. Cleanup anonymous conversations
db.conversations.deleteMany({
  $or: [
    { userId: null },
    { userId: { $regex: /^lia_/ } } // Session IDs
  ]
})

// 2. Add indexes for performance
db.conversations.createIndex({ userId: 1, createdAt: -1 })
db.conversations.createIndex({ updatedAt: -1 })

// 3. Add index for analytics
db.usageLogs.createIndex({ userId: 1, timestamp: -1 })
db.usageLogs.createIndex({ event: 1, timestamp: -1 })
```

### Environment Variables Nécessaires

```env
# API (.env.local)
GEMINI_API_KEY=...
EZAUTH_API_URL=https://ezauth.up.railway.app
JWT_SECRET=... (from EZAuth)

# Web (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5070/api
NEXT_PUBLIC_EZAUTH_URL=http://localhost:5010/api/auth
```

### Fichiers Clés du Projet

```
apps/green-pulse/
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── chat.ts ← IA chat, auth, logging
│   │   │   ├── conversations.ts ← CRUD conversations
│   │   │   └── analytics.ts ← Beta stats (NEW)
│   │   ├── services/
│   │   │   └── gemini.service.ts ← IA prompts, fixes
│   │   └── models/
│   │       ├── Conversation.ts
│   │       └── UsageLog.ts ← Analytics (NEW)
├── web/
│   ├── src/
│   │   ├── app/[locale]/
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx ← Main chat UI
│   │   │   │   └── layout.tsx ← OG metadata (NEW)
│   │   │   └── admin/
│   │   │       └── beta-stats/page.tsx ← Dashboard (NEW)
│   │   ├── components/
│   │   │   ├── lia/
│   │   │   │   ├── LiaThread.tsx ← Chat interface
│   │   │   │   └── ThreadProvider.tsx
│   │   │   └── chat/
│   │   │       ├── ChatHeader.tsx ← Logo + Sign up (NEW)
│   │   │       ├── ChatLayout.tsx ← Layout wrapper (NEW)
│   │   │       └── ContactModal.tsx ← Contact form (NEW)
│   │   └── middleware.ts ← Auth guard (NEW)
│   └── public/
│       ├── logo.png ← NEW green pulse logo
│       ├── og-chat.png ← NEW OG image
│       └── og-home.png ← NEW OG image
└── ROADMAP.md ← This file
```

---

## 🐛 Known Issues & Tech Debt

### Current Issues
1. **Conversations anonymes** - Doivent être supprimées (Phase 3)
2. **Edit message bug** - Race condition (Phase 5)
3. **Markdown excessif** - Réponses IA illisibles (Phase 5)
4. **Pas d'auth** - Chat accessible sans login (Phase 3)
5. **Pas de tracking** - Impossible analyser usage beta (Phase 6)

### Tech Debt à Adresser
- [ ] Migrer de `session_id` vers `userId` partout
- [ ] Remplacer Gemini 1.5 par 2.5 Flash (meilleur)
- [ ] Ajouter rate limiting (10 messages/min)
- [ ] Implémenter caching Gemini responses
- [ ] Optimiser queries MongoDB (indexes)

---

## 📞 Support & Questions

**Owner:** Tech Cloud Team
**Slack:** #green-pulse-dev
**Docs:** `apps/green-pulse/docs/`

**Questions fréquentes:**

**Q: Pourquoi forcer auth alors que chat gratuit ?**
A: Privacy. Sans auth, conversations visibles par tous. Avec auth, isolation garantie.

**Q: Pourquoi Gemini et pas OpenAI ?**
A: Coût. Gemini 2.5 Flash = gratuit jusqu'à 1M tokens/jour. OpenAI = $$.

**Q: Dashboard analytics accessible à qui ?**
A: Admin only. Role `admin` dans JWT token (from EZAuth).

---

## 🎉 Changelog

### 2025-10-22 - Initial Roadmap
- Created complete roadmap with 10 phases
- Defined priorities and order
- Added testing checklist
- Documented tech debt

---

**Status:** 📝 Planning Complete
**Next Action:** Start Phase 3 (Security & Privacy)
**Target Launch:** 2 weeks from start
