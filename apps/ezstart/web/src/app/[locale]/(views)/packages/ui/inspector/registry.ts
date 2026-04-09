/**
 * Design System Inspector — Component Registry
 *
 * Metadata-only registry mapping component names to their design token capabilities
 * and hierarchy relationships. No actual React component imports here.
 */

export type ComponentLevel = 'base' | 'composed' | 'complex'

export type ComponentEntry = {
  name: string
  level: ComponentLevel
  tokens: string[]
  children?: string[]
  defaultProps?: Record<string, unknown>
  description?: string
}

export const componentRegistry: Record<string, ComponentEntry> = {
  // ─── Base (apply tokens directly) ──────────────────────────
  Button: {
    name: 'Button',
    level: 'base',
    tokens: ['size', 'variant'],
    description: 'Primary interactive element with size and variant tokens',
    defaultProps: { children: 'Click me' },
  },
  Input: {
    name: 'Input',
    level: 'base',
    tokens: ['size'],
    description: 'Text input field with size token',
    defaultProps: { placeholder: 'Type here...' },
  },
  Card: {
    name: 'Card',
    level: 'base',
    tokens: ['variant'],
    children: ['CardHeader', 'CardContent'],
    description: 'Container with variant token (default/floating/ghost/elevated)',
    defaultProps: {},
  },
  CardHeader: {
    name: 'CardHeader',
    level: 'base',
    tokens: [],
    description: 'Card header section',
    defaultProps: {},
  },
  CardContent: {
    name: 'CardContent',
    level: 'base',
    tokens: [],
    description: 'Card content section',
    defaultProps: {},
  },
  Badge: {
    name: 'Badge',
    level: 'base',
    tokens: ['variant'],
    description: 'Small label with variant token for status/category display',
    defaultProps: { children: 'Label' },
  },
  Tabs: {
    name: 'Tabs',
    level: 'base',
    tokens: [],
    children: ['TabsList', 'TabsTrigger', 'TabsContent'],
    description: 'Tab navigation container — no design tokens yet',
    defaultProps: {},
  },

  // ─── Composed (merge + drill tokens to children) ──────────
  Checkbox: {
    name: 'Checkbox',
    level: 'composed',
    tokens: ['density'],
    children: ['Label'],
    description: 'Checkbox with label — drills density to Label',
    defaultProps: {},
  },
  PasswordInput: {
    name: 'PasswordInput',
    level: 'composed',
    tokens: ['density'],
    children: ['Input', 'Button'],
    description: 'Password field with toggle — drills density to Input + Button',
    defaultProps: {},
  },
  DataTable: {
    name: 'DataTable',
    level: 'composed',
    tokens: ['density'],
    children: ['Table', 'Button', 'Input'],
    description: 'TanStack-powered data table — drills density to Table + Button + Input',
    defaultProps: {},
  },
  ThreadComposer: {
    name: 'ThreadComposer',
    level: 'composed',
    tokens: ['density'],
    children: ['Button'],
    description: 'Message composer — drills density to Button',
    defaultProps: {},
  },
  AlertDialog: {
    name: 'AlertDialog',
    level: 'composed',
    tokens: ['size'],
    children: ['Button'],
    description: 'Confirmation dialog — drills size to Button',
    defaultProps: {},
  },

  // ─── Complex (orchestrate + drill tokens deep) ────────────
  ThreadLayout: {
    name: 'ThreadLayout',
    level: 'complex',
    tokens: ['density', 'colorScheme'],
    children: ['ThreadSidebar', 'ThreadComposer', 'ThreadMessages', 'ThreadHeader'],
    description: 'Full chat layout — orchestrates density + colorScheme through all children',
    defaultProps: {},
  },
  ThreadSidebar: {
    name: 'ThreadSidebar',
    level: 'complex',
    tokens: ['density'],
    children: ['Button', 'ConversationItem'],
    description: 'Sidebar with conversation list — drills density to Button + ConversationItem',
    defaultProps: {},
  },
}

/** Get all entries for a given level */
export function getComponentsByLevel(level: ComponentLevel): ComponentEntry[] {
  return Object.values(componentRegistry).filter(entry => entry.level === level)
}

/** Get a single entry by name */
export function getComponent(name: string): ComponentEntry | undefined {
  return componentRegistry[name]
}

/** Predefined chains for quick exploration */
export const popularChains = [
  {
    label: 'ThreadLayout \u2192 ThreadComposer \u2192 Button',
    chain: ['ThreadLayout', 'ThreadComposer', 'Button'],
  },
  {
    label: 'ThreadSidebar \u2192 ConversationItem \u2192 Button',
    chain: ['ThreadSidebar', 'ConversationItem', 'Button'],
  },
  {
    label: 'DataTable \u2192 Button',
    chain: ['DataTable', 'Button'],
  },
]
