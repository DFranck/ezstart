import type { ThreadTheme } from '@ezstart/ui/components'

/**
 * GreenPulse custom thread theme
 *
 * This theme uses the GreenPulse brand colors and can be customized
 * by the client without touching component code.
 *
 * To modify colors, simply update the Tailwind classes below.
 */
export const greenPulseThreadTheme: Partial<ThreadTheme> = {
  // Main background - light gray as requested
  background: 'bg-[#f6f6f6] dark:bg-slate-950',

  // Message bubbles
  message: {
    user: {
      // User messages - GreenPulse brand green
      background: 'bg-[#10b981]', // Emerald green
      text: 'text-white',
      border: 'border-transparent',
    },
    ai: {
      // AI messages - clean white/dark
      background: 'bg-white dark:bg-slate-800',
      text: 'text-slate-900 dark:text-slate-100',
      border: 'border-slate-200 dark:border-slate-700',
    },
  },

  // Buttons
  button: {
    primary: 'bg-[#10b981] hover:bg-[#059669] text-white',
    secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600',
  },

  // Composer (input area at bottom)
  composer: {
    background: 'bg-white dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-700',
    buttonBackground: 'bg-[#10b981]',
    buttonHover: 'hover:bg-[#059669]',
  },

  // Sidebar (conversations list)
  sidebar: {
    background: 'bg-white dark:bg-slate-900',
    itemActive: 'bg-[#10b981]/10 dark:bg-[#10b981]/20',
    itemHover: 'hover:bg-slate-100 dark:hover:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
  },

  // General borders
  border: 'border-slate-200 dark:border-slate-700',
}

