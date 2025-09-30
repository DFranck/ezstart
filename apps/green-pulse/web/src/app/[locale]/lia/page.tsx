'use client'

import { ThreadProvider } from '@/components/lia/ThreadProvider';
import { LiaThread } from '@/components/lia/LiaThread';
import { useMemo } from 'react';

export default function LiaPage() {
  const sessionId = useMemo(() => `lia_${Date.now()}`, []);

  const config = useMemo(() => ({
    endpoint: '/api/chat',
    method: 'POST' as const,
    headers: {
      'Content-Type': 'application/json',
    },
    formatRequest: (message: string) => ({
      message,
      extract_esg: false,
      session_id: sessionId,
    }),
    formatResponse: (data: any) => {
      return data.data?.response || data.response || 'No response';
    },
    onError: (error: Error) => {
      console.error('LIA Chat Error:', error);
    },
  }), [sessionId]);

  return (
    <ThreadProvider config={config}>
      <LiaThread />
    </ThreadProvider>
  );
}