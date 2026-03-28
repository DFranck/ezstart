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
    async (message: string, files?: File[], skipAddingUserMessage = false) => {
      if (!message.trim()) return;

      setError(null);
      setLastUserMessage(message);

      // Add user message (skip if called from editMessage)
      if (!skipAddingUserMessage) {
        const userMessage: ThreadMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
      }

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
          // Try to extract error message from response body
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // If JSON parsing fails, use status text
          }
          throw new Error(errorMessage);
        }

        // Auto-detect SSE vs JSON based on Content-Type
        const contentType = response.headers.get('Content-Type') || '';
        const isSSE = contentType.includes('text/event-stream');
        const shouldStream = enableStreaming && isSSE && response.body;

        // Handle streaming response (SSE only)
        if (shouldStream) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let lastData: any = null;

          // Add placeholder AI message for streaming
          const aiMessageId = `ai-${Date.now()}`;
          const aiMessage: ThreadMessage = {
            id: aiMessageId,
            role: 'ai',
            content: '',
            timestamp: new Date().toISOString(),
            streaming: true,
          };
          setMessages((prev) => [...prev, aiMessage]);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') continue;

                  try {
                    const data = JSON.parse(dataStr);
                    lastData = data;

                    // Extract text from the response
                    const text = formatResponse(data);
                    if (text) {
                      fullText += text;
                      setStreamingText(fullText);

                      // Update message content
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === aiMessageId ? { ...msg, content: fullText } : msg
                        )
                      );
                    }
                  } catch (e) {
                    console.warn('Failed to parse SSE data:', dataStr);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          const responseTime = Date.now() - requestStartTime;

          // Finalize the message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: fullText, responseTime, streaming: false }
                : msg
            )
          );

          if (onSuccess && lastData) {
            onSuccess(lastData);
          }
        } else {
          // Non-streaming response
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

      // Get the original message
      const originalMessage = messages[messageIndex];
      if (!originalMessage) return; // Safety check

      // Remove all messages after the edited message (including its AI response)
      const messagesUpToEdit = messages.slice(0, messageIndex);

      // Update the edited message content
      const editedMessage: ThreadMessage = {
        ...originalMessage,
        role: originalMessage.role, // Explicitly preserve role type
        content: newContent,
      };

      // Set messages to include only up to the edited message
      setMessages([...messagesUpToEdit, editedMessage]);

      // Re-send the edited message to get a new AI response
      // Skip adding user message since we already added the edited one above
      await sendMessage(newContent, undefined, true);
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