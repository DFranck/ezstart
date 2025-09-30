# Thread Components - Guide d'utilisation

Système de composants Thread agnostique et réutilisable pour créer des interfaces de chat avec n'importe quelle API.

## 🚀 Installation

Les composants sont déjà disponibles dans `@ezstart/ui` :

```tsx
import {
  Thread,
  ThreadMessages,
  ThreadComposer,
  ThreadWelcome,
  useThreadAPI
} from '@ezstart/ui';
```

## 📦 Composants disponibles

### 1. `useThreadAPI` - Hook pour connecter à une API

Hook qui gère l'état et la communication avec votre API.

```tsx
const thread = useThreadAPI({
  endpoint: '/api/chat',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  formatRequest: (message, files) => ({ message }),
  formatResponse: (data) => data.response,
  onSuccess: (data) => console.log('Success:', data),
  onError: (error) => console.error('Error:', error),
});
```

### 2. `ThreadProvider` - Provider pour partager l'état

Wrapper qui partage l'état du thread avec tous les composants enfants.

```tsx
<ThreadProvider config={{ endpoint: '/api/chat' }}>
  {/* Vos composants */}
</ThreadProvider>
```

### 3. `Thread` - Container principal

Container avec auto-scroll automatique.

```tsx
<Thread messages={messages} streamingText={streamingText}>
  {children}
</Thread>
```

### 4. `ThreadMessages` - Liste de messages

Affiche tous les messages avec support du streaming.

```tsx
<ThreadMessages
  messages={messages}
  loading={loading}
  streamingText={streamingText}
  isNewThread={isNewThread}
  loadingText="Loading..."
  onRetry={resendLastMessage}
  formatResponseTime={(time) => `${time}ms`}
/>
```

### 5. `ThreadComposer` - Zone de saisie

Textarea avec auto-resize et bouton d'envoi.

```tsx
<ThreadComposer
  onSubmit={sendMessage}
  loading={loading}
  placeholder="Type your message..."
  isNewThread={isNewThread}
/>
```

### 6. `ThreadWelcome` - Message d'accueil

Message affiché quand le thread est vide.

```tsx
<ThreadWelcome
  show={isNewThread}
  title="Welcome"
  description="How can I help you?"
/>
```

## 🎯 Exemple complet : Connecter à une API

### Étape 1 : Créer le Provider (réutilisable)

```tsx
// src/components/chat/ChatProvider.tsx
'use client';

import { createContext, useContext } from 'react';
import { useThreadAPI, ThreadAPIConfig } from '@ezstart/ui';

const ChatContext = createContext(undefined);

export function ChatProvider({ children, config }) {
  const thread = useThreadAPI(config);
  return <ChatContext.Provider value={thread}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChatContext must be used within ChatProvider');
  return context;
}
```

### Étape 2 : Créer le composant Thread

```tsx
// src/components/chat/ChatThread.tsx
'use client';

import { Thread, ThreadMessages, ThreadComposer, ThreadWelcome } from '@ezstart/ui';
import { useChatContext } from './ChatProvider';

export function ChatThread() {
  const {
    messages,
    loading,
    streamingText,
    sendMessage,
    resendLastMessage,
    isNewThread,
  } = useChatContext();

  return (
    <div className="flex flex-col h-screen">
      <Thread messages={messages} streamingText={streamingText}>
        <ThreadMessages
          messages={messages}
          loading={loading}
          streamingText={streamingText}
          isNewThread={isNewThread}
          onRetry={resendLastMessage}
        />
      </Thread>

      <ThreadComposer
        onSubmit={sendMessage}
        loading={loading}
        placeholder="Ask me anything..."
        isNewThread={isNewThread}
        welcomeMessage={
          <ThreadWelcome
            show={isNewThread}
            title="Welcome"
            description="How can I help you today?"
          />
        }
      />
    </div>
  );
}
```

### Étape 3 : Utiliser dans une page

```tsx
// src/app/chat/page.tsx
import { ChatProvider } from '@/components/chat/ChatProvider';
import { ChatThread } from '@/components/chat/ChatThread';

export default function ChatPage() {
  return (
    <ChatProvider
      config={{
        endpoint: '/api/chat',
        method: 'POST',
        formatRequest: (message) => ({
          message,
          timestamp: new Date().toISOString()
        }),
        formatResponse: (data) => data.response || data.message,
        onError: (error) => console.error('Chat error:', error),
      }}
    >
      <ChatThread />
    </ChatProvider>
  );
}
```

## 🔧 Configuration de l'API

### Structure attendue par l'API

**Request:**
```json
{
  "message": "Hello, how are you?",
  "session_id": "session_123",
  "extract_esg": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I'm doing well, thank you!",
    "session_id": "session_123"
  },
  "timestamp": "2025-09-30T10:00:00Z"
}
```

### Adapter le format

Utilisez `formatRequest` et `formatResponse` pour adapter à votre API :

```tsx
config={{
  endpoint: '/api/chat',
  formatRequest: (message, files) => ({
    // Votre format custom
    text: message,
    userId: getUserId(),
    files: files?.map(f => f.name),
  }),
  formatResponse: (data) => {
    // Extraire la réponse de votre structure
    return data.result?.text || data.message;
  },
}}
```

## 🎨 Personnalisation

### Styling

Tous les composants utilisent Tailwind CSS et peuvent être personnalisés :

```tsx
<Thread className="bg-gray-50">
  <ThreadMessages />
</Thread>

<ThreadComposer className="fixed bottom-0 left-0 right-0" />
```

### Custom Message Renderer

```tsx
<ThreadMessages
  messages={messages}
  renderMessage={(msg, index) => (
    <div key={index} className="custom-message">
      <strong>{msg.role}:</strong> {msg.content}
    </div>
  )}
/>
```

## 📱 Exemple : Green Pulse LIA

Voir l'implémentation complète dans :
- `@ezstart/apps/green-pulse/web/src/components/lia/`
- `@ezstart/apps/green-pulse/web/src/app/[locale]/lia/page.tsx`

## 🔄 Pattern de réutilisation

Pour chaque nouveau projet :

1. **Copier** `ThreadProvider.tsx` et `LiaThread.tsx`
2. **Renommer** selon votre contexte (ex: `SupportThread`, `AIThread`)
3. **Configurer** l'endpoint et les formats dans la page
4. **Personnaliser** les textes et styles

Exemple pour un support client :

```tsx
// src/components/support/SupportProvider.tsx
export function SupportProvider({ children, config }) { /* ... */ }

// src/app/support/page.tsx
<SupportProvider
  config={{
    endpoint: '/api/support',
    formatRequest: (message) => ({ message, type: 'support' }),
    formatResponse: (data) => data.agent_response,
  }}
>
  <SupportThread />
</SupportProvider>
```

## 🐛 Debugging

Activer les logs :

```tsx
config={{
  endpoint: '/api/chat',
  onSuccess: (data) => console.log('✅ Success:', data),
  onError: (error) => console.error('❌ Error:', error),
}}
```

## 📚 Types TypeScript

```tsx
import type {
  ThreadMessage,
  ThreadAPIConfig,
  UseThreadAPIReturn
} from '@ezstart/ui';
```