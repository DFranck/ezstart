'use client'

import {
  Button,
  Div,
  FloatingPanel,
  H2,
  P,
  Span,
  Thread,
  ThreadComposer,
  ThreadLayout,
  ThreadMessages,
  ThreadSidebar,
  ThreadSidebarToggle,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme'
import { useState, useCallback, useMemo } from 'react'

type PlaygroundMessage = {
  id: string
  role: 'user' | 'ai'
  content: string
  timestamp?: string
}

const MOCK_CONVERSATIONS = [
  { id: '1', title: 'First conversation', timestamp: new Date(), unread: false },
  { id: '2', title: 'Second conversation', timestamp: new Date(), unread: true },
  {
    id: '3',
    title: 'Old chat about design tokens',
    timestamp: new Date(Date.now() - 86400000),
    unread: false,
  },
]

/** CSS vars that apps can override via data-app themes */
const THEME_VARS = [
  {
    group: 'Primary',
    vars: [
      { name: '--primary', label: 'primary' },
      { name: '--primary-foreground', label: 'primary-fg' },
    ],
  },
  {
    group: 'Secondary',
    vars: [
      { name: '--secondary', label: 'secondary' },
      { name: '--secondary-foreground', label: 'secondary-fg' },
    ],
  },
  {
    group: 'Accent',
    vars: [
      { name: '--accent', label: 'accent' },
      { name: '--accent-foreground', label: 'accent-fg' },
    ],
  },
  {
    group: 'Background',
    vars: [
      { name: '--background', label: 'background' },
      { name: '--foreground', label: 'foreground' },
    ],
  },
  {
    group: 'Muted',
    vars: [
      { name: '--muted', label: 'muted' },
      { name: '--muted-foreground', label: 'muted-fg' },
    ],
  },
  {
    group: 'Card',
    vars: [
      { name: '--card', label: 'card' },
      { name: '--card-foreground', label: 'card-fg' },
    ],
  },
  {
    group: 'Border',
    vars: [
      { name: '--border', label: 'border' },
      { name: '--input', label: 'input' },
      { name: '--ring', label: 'ring' },
    ],
  },
  {
    group: 'Destructive',
    vars: [
      { name: '--destructive', label: 'destructive' },
      { name: '--destructive-foreground', label: 'destructive-fg' },
    ],
  },
] as const

function CssVarSwatch({
  varName,
  value,
  onChange,
  onReset,
}: {
  varName: string
  value: string
  onChange: (val: string) => void
  onReset: () => void
}) {
  return (
    <Div className="flex items-center gap-1">
      <Span
        className="w-3 h-3 rounded-sm border border-foreground/20 shrink-0 inline-block"
        style={{ backgroundColor: value || `var(${varName})` }}
      />
      <input
        type="color"
        value={value || '#888888'}
        onChange={e => onChange(e.target.value)}
        className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
        title={varName}
      />
      {value && (
        <Button onClick={onReset} variant="ghost" size="icon" className="h-4 w-4 text-[10px]">
          ×
        </Button>
      )}
    </Div>
  )
}

export default function ThreadPlayground() {
  const [height, setHeight] = useState<'viewport' | 'fill'>('viewport')
  const [showSidebar, setShowSidebar] = useState(true)
  const [activeConv, setActiveConv] = useState<string | null>(null)
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [appTheme, setAppTheme] = useState<string>('ezstart')
  const [panelOpen, setPanelOpen] = useState(true)
  const [showSidebarCloseButton, setShowSidebarCloseButton] = useState(false)
  const [customVars, setCustomVars] = useState<Record<string, string>>({})
  const [streamingText, setStreamingText] = useState('')

  const handleSubmit = useCallback(
    async (text: string) => {
      const userMsg: PlaygroundMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, userMsg])

      setStreamingText('')
      const response = `This is a test response to "${text}". Thread is rendering correctly with height="${height}", appTheme="${appTheme}".`
      for (let i = 0; i < response.length; i++) {
        await new Promise(r => setTimeout(r, 20))
        setStreamingText(response.slice(0, i + 1))
      }

      setStreamingText('')
      const assistantMsg: PlaygroundMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: response,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    },
    [height, appTheme]
  )

  const handleNewConversation = useCallback(() => {
    setActiveConv(null)
    setMessages([])
  }, [])

  const setVar = useCallback((name: string, value: string) => {
    setCustomVars(prev => ({ ...prev, [name]: value }))
  }, [])

  const resetVar = useCallback((name: string) => {
    setCustomVars(prev => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const resetAllVars = useCallback(() => setCustomVars({}), [])

  const wrapperStyle = useMemo(() => {
    const style: Record<string, string | undefined> = {}
    for (const [key, val] of Object.entries(customVars)) {
      style[key] = val
    }
    return style as React.CSSProperties
  }, [customVars])

  const customCount = Object.keys(customVars).length

  const threadContent = (
    <ThreadLayoutContent
      height={height}
      showSidebar={showSidebar}
      showSidebarCloseButton={showSidebarCloseButton}
      activeConv={activeConv}
      messages={messages}
      streamingText={streamingText}
      setActiveConv={setActiveConv}
      handleNewConversation={handleNewConversation}
      handleSubmit={handleSubmit}
    />
  )

  return (
    <Div
      className="relative"
      data-app={appTheme !== 'none' ? appTheme : undefined}
      style={wrapperStyle}
    >
      {/* Controls panel */}
      <FloatingPanel
        title="Thread Playground"
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        minimizable
        closable
        draggable
        defaultPosition={{ x: 400, y: 16 }}
        className="z-[60] text-xs !w-72 !max-h-[85vh]"
      >
        <Div className="space-y-3">
          {/* App Theme */}
          <Div className="space-y-1">
            <Span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              App Theme
            </Span>
            <select
              value={appTheme}
              onChange={e => setAppTheme(e.target.value)}
              className="bg-muted rounded px-1.5 py-1 w-full text-xs"
            >
              <option value="none">none (defaults)</option>
              <option value="ezstart">ezstart (violet)</option>
              <option value="green-pulse">green-pulse (vert)</option>
              <option value="ezbill">ezbill (bleu)</option>
              <option value="fengshui">fengshui (or/rouge)</option>
              <option value="gacha-analyzer">gacha-analyzer</option>
            </select>
          </Div>

          {/* Layout */}
          <Div className="space-y-1">
            <Span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Layout
            </Span>
            <Div className="flex items-center gap-2">
              <Span>height:</Span>
              <select
                value={height}
                onChange={e => setHeight(e.target.value as 'viewport' | 'fill')}
                className="bg-muted rounded px-1 py-0.5 flex-1 text-xs"
              >
                <option value="viewport">viewport</option>
                <option value="fill">fill</option>
              </select>
            </Div>
            <Div className="flex items-center gap-2">
              <Span>sidebar:</Span>
              <input
                type="checkbox"
                checked={showSidebar}
                onChange={e => setShowSidebar(e.target.checked)}
              />
            </Div>
            <Div className="flex items-center gap-2">
              <Span>sidebar ×:</Span>
              <input
                type="checkbox"
                checked={showSidebarCloseButton}
                onChange={e => setShowSidebarCloseButton(e.target.checked)}
                title="Show × close button inside the sidebar Sheet"
              />
            </Div>
            <Div className="flex items-center gap-2">
              <Span>theme:</Span>
              <ThemeSwitcher />
            </Div>
          </Div>

          {/* CSS Variables */}
          <Div className="space-y-2">
            <Div className="flex items-center justify-between">
              <Span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                CSS Variables
              </Span>
              {customCount > 0 && (
                <Button
                  onClick={resetAllVars}
                  variant="ghost"
                  size="sm"
                  className="h-4 text-[10px] text-destructive px-1"
                >
                  reset all ({customCount})
                </Button>
              )}
            </Div>
            {THEME_VARS.map(group => (
              <Div key={group.group}>
                <Span className="text-[10px] text-muted-foreground">{group.group}</Span>
                <Div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-0.5">
                  {group.vars.map(v => (
                    <Div key={v.name} className="flex items-center gap-1">
                      <CssVarSwatch
                        varName={v.name}
                        value={customVars[v.name] || ''}
                        onChange={val => setVar(v.name, val)}
                        onReset={() => resetVar(v.name)}
                      />
                      <Span className="text-[10px] truncate" title={v.name}>
                        {v.label}
                      </Span>
                    </Div>
                  ))}
                </Div>
              </Div>
            ))}
          </Div>

          {/* Status */}
          <Div className="text-muted-foreground pt-1 border-t text-[10px]">
            <Span>
              Messages: {messages.length} | Active: {activeConv ?? 'none'}
            </Span>
            {customCount > 0 && <Span className="block">Overrides: {customCount} var(s)</Span>}
          </Div>
        </Div>
      </FloatingPanel>

      {/* Reopen button when panel is closed */}
      {!panelOpen && (
        <Button
          onClick={() => setPanelOpen(true)}
          variant="default"
          size="icon"
          className="fixed top-4 right-4 z-[60] rounded-full shadow-lg"
          aria-label="Open controls"
        >
          ⚙
        </Button>
      )}

      {/* Resizable container for fill mode, full page for viewport mode */}
      {height === 'fill' ? (
        <Div
          className="mx-auto mt-8 border-2 border-dashed border-primary/30 rounded-lg overflow-hidden bg-muted/20"
          style={{
            width: '80vw',
            height: '70vh',
            resize: 'both',
            overflow: 'hidden',
            minWidth: '320px',
            minHeight: '300px',
            maxWidth: '95vw',
            maxHeight: '90vh',
          }}
        >
          {threadContent}
        </Div>
      ) : (
        threadContent
      )}
    </Div>
  )
}

/** Extracted to avoid duplication between viewport and fill modes */
function ThreadLayoutContent({
  height,
  showSidebar,
  showSidebarCloseButton,
  activeConv,
  messages,
  streamingText,
  setActiveConv,
  handleNewConversation,
  handleSubmit,
}: {
  height: 'viewport' | 'fill'
  showSidebar: boolean
  showSidebarCloseButton: boolean
  activeConv: string | null
  messages: PlaygroundMessage[]
  streamingText: string
  setActiveConv: (id: string | null) => void
  handleNewConversation: () => void
  handleSubmit: (text: string) => Promise<void>
}) {
  return (
    <ThreadLayout
      height={height}
      showSidebarCloseButton={showSidebarCloseButton}
      sidebarToggle={
        showSidebar ? (
          <ThreadSidebarToggle className="fixed left-4 top-4 z-50 lg:hidden" variant="default" />
        ) : undefined
      }
      sidebar={
        showSidebar ? (
          <ThreadSidebar
            conversations={MOCK_CONVERSATIONS}
            activeConversationId={activeConv ?? undefined}
            onConversationSelect={setActiveConv}
            onNewConversation={handleNewConversation}
            newConversationLabel="New Chat"
            emptyState="No conversations yet"
          />
        ) : undefined
      }
    >
      <Thread messages={messages} streamingText={streamingText}>
        <ThreadMessages
          messages={messages}
          streamingText={streamingText}
          isNewThread={messages.length === 0}
          loadingText="Thinking..."
        />
      </Thread>

      <ThreadComposer
        onSubmit={handleSubmit}
        placeholder="Type a test message..."
        sendLabel="Send"
        isNewThread={messages.length === 0}
        welcomeMessage={
          messages.length === 0 ? (
            <Div className="flex flex-col items-center justify-center flex-1 gap-2 text-center px-4">
              <H2 className="text-2xl font-bold">Thread Playground</H2>
              <P className="text-muted-foreground">Pure Thread component — no AI, no app context</P>
              <P className="text-xs text-muted-foreground">
                Use the controls panel to test CSS vars
              </P>
            </Div>
          ) : undefined
        }
      />
    </ThreadLayout>
  )
}
