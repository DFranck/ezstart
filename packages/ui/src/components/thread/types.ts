export type ThreadMessage = {
  id?: string
  role: 'user' | 'ai'
  content: string
  responseTime?: number
  timestamp?: string
  streaming?: boolean
}

export type ThreadContextValue<TMessage extends ThreadMessage = ThreadMessage> = {
  messages: TMessage[]
  isNewThread: boolean
  loading: boolean
  streamingText: string
  canResend: boolean
  handleSubmit: (e: React.FormEvent) => Promise<void> | void
  resendLastUserMessage: () => Promise<void> | void
  files?: File[]
  setFiles?: (value: File[] | ((prev: File[]) => File[])) => void
}

export type ThreadMessageMeta = {
  responseTime?: number
  timestamp?: string
  streaming?: boolean
}

export type ThreadMessageProps = {
  role: 'user' | 'ai'
  children: React.ReactNode
  meta?: ThreadMessageMeta
  isLastUserMessage?: boolean
}

export type ThreadProps = {
  children: React.ReactNode
  className?: string
}

export type ThreadMessagesProps<TMessage extends ThreadMessage = ThreadMessage> = {
  messages: TMessage[]
  loading?: boolean
  streamingText?: string
  isNewThread?: boolean
  renderMessage?: (message: TMessage, index: number) => React.ReactNode
  loadingText?: string
}

export type ThreadComposerProps = {
  onSubmit: (message: string, files?: File[]) => Promise<void> | void
  loading?: boolean
  disabled?: boolean
  placeholder?: string
  welcomeMessage?: React.ReactNode
  showFileUpload?: boolean
  className?: string
  headerSlot?: React.ReactNode
  isNewThread?: boolean
}

export type ThreadWelcomeProps = {
  title?: string
  description?: string
  show?: boolean
  className?: string
}
