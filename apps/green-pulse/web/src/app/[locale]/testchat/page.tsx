'use client'

import { AILayout } from '@ezstart/ai-sdk/client'
import { useLocale } from 'next-intl'

export default function TestChatPage() {
  const locale = useLocale()

  return (
    <main className="h-dvh">
      <AILayout
        appName="green-pulse"
        locale={locale}
        colorScheme="green"
        texts={{
          welcomeTitle: 'AI SDK Test',
          welcomeDescription: 'Testing the agnostic AILayout component from @ezstart/ai-sdk',
          composerPlaceholder: 'Test a message...',
          loadingText: 'Thinking...',
          newChatLabel: 'New Chat',
        }}
      />
    </main>
  )
}
