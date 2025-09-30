'use client';

import {
  Thread,
  ThreadMessages,
  ThreadComposer,
  ThreadWelcome,
} from '@ezstart/ui/components';
import { useThreadContext } from './ThreadProvider';

export function LiaThread() {
  const {
    messages,
    loading,
    streamingText,
    sendMessage,
    resendLastMessage,
    isNewThread,
  } = useThreadContext();

  return (
    <div className='flex flex-col h-screen'>
      <Thread messages={messages} streamingText={streamingText}>
        <ThreadMessages
          messages={messages}
          loading={loading}
          streamingText={streamingText}
          isNewThread={isNewThread}
          loadingText='LIA is thinking'
          onRetry={resendLastMessage}
          formatResponseTime={(time) => `${(time / 1000).toFixed(2)}s`}
        />
      </Thread>

      <ThreadComposer
        onSubmit={sendMessage}
        loading={loading}
        placeholder='Ask LIA anything about sustainability...'
        isNewThread={isNewThread}
        welcomeMessage={
          <ThreadWelcome
            show={isNewThread}
            title='Welcome to LIA'
            description='Your AI assistant for sustainability and ESG reporting'
          />
        }
      />
    </div>
  );
}