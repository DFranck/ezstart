'use client';

import { useState, useCallback } from 'react';
import { ThreadMessage } from '../components/thread/types';

export type ThreadAPIConfig = {
  endpoint: string;
  method?: 'POST' | 'GET';
  headers?: Record<string, string>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  formatRequest?: (message: string, files?: File[]) => any;
  formatResponse?: (data: any) => string;
  enableStreaming?: boolean;
};

export type UseThreadAPIReturn = {
  messages: ThreadMessage[];
  loading: boolean;
  streamingText: string;
  error: string | null;
  sendMessage: (message: string, files?: File[]) => Promise<void>;
  resendLastMessage: () => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  clearMessages: () => void;
  loadMessages: (messages: ThreadMessage[]) => void;
  isNewThread: boolean;
};

/**
 * Hook réutilisable pour connecter les composants Thread à n'importe quelle API
 *
 * @example
 * ```tsx
 * const thread = useThreadAPI({
 *   endpoint: '/api/chat',
 *   formatRequest: (message) => ({ message, extract_esg: false }),
 *   formatResponse: (data) => data.data.response,
 * });
 * ```
 */
export function useThreadAPI(config: ThreadAPIConfig): UseThreadAPIReturn {
  const {
    endpoint,
    method = 'POST',
    headers = { 'Content-Type': 'application/json' },
    onSuccess,
    onError,
    formatRequest = (message) => ({ message }),
    formatResponse = (data) => data.response || data.message || JSON.stringify(data),
    enableStreaming = false,
  } = config;

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  const sendMessage = useCallback(
    async (message: string, files?: File[]) => {
      if (!message.trim()) return;

      setError(null);
      setLastUserMessage(message);

      // Add user message
      const userMessage: ThreadMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
        const requestBody = formatRequest(message, files);
        const requestStartTime = Date.now();

        const response = await fetch(endpoint, {
          method,
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - requestStartTime;
        const aiResponse = formatResponse(data);

        // Add AI response
        const aiMessage: ThreadMessage = {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          responseTime,
        };

        setMessages((prev) => [...prev, aiMessage]);

        if (onSuccess) {
          onSuccess(data);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);

        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setLoading(false);
        setStreamingText('');
      }
    },
    [endpoint, method, headers, formatRequest, formatResponse, onSuccess, onError]
  );

  const resendLastMessage = useCallback(async () => {
    if (!lastUserMessage) return;

    // Remove last user message if it exists
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage?.role === 'user') {
        return prev.slice(0, -1);
      }
      return prev;
    });

    await sendMessage(lastUserMessage);
  }, [lastUserMessage, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setStreamingText('');
    setLastUserMessage('');
  }, []);

  const loadMessages = useCallback((newMessages: ThreadMessage[]) => {
    setMessages(newMessages);
    setError(null);
    setStreamingText('');
  }, []);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      // Find the message index
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      // Remove all messages after the edited message (including its AI response)
      const messagesUpToEdit = messages.slice(0, messageIndex);

      // Update the edited message content
      const editedMessage: ThreadMessage = {
        ...messages[messageIndex],
        content: newContent,
      };

      // Set messages to include only up to the edited message
      setMessages([...messagesUpToEdit, editedMessage]);

      // Re-send the edited message to get a new AI response
      await sendMessage(newContent);
    },
    [messages, sendMessage]
  );

  const isNewThread = messages.length === 0;

  return {
    messages,
    loading,
    streamingText,
    error,
    sendMessage,
    resendLastMessage,
    editMessage,
    clearMessages,
    loadMessages,
    isNewThread,
  };
}