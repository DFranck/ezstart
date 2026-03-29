import type { ThreadTheme } from '@ezstart/ui/components'

/**
 * GreenPulse custom thread theme
 *
 * This theme uses semantic Tailwind colors from the design system.
 * Brand-specific colors use the gp-primary CSS variable.
 *
 * To modify colors, simply update the Tailwind classes below.
 */
export const greenPulseThreadTheme: Partial<ThreadTheme> = {
  // Main background
  background: 'bg-muted dark:bg-background',

  // Message bubbles
  message: {
    user: {
      // User messages - GreenPulse brand green
      background: 'bg-primary',
      text: 'text-primary-foreground',
      border: 'border-transparent',
    },
    ai: {
      // AI messages - clean card style
      background: 'bg-card dark:bg-card',
      text: 'text-card-foreground dark:text-card-foreground',
      border: 'border-border dark:border-border',
    },
  },

  // Buttons
  button: {
    primary: 'bg-primary hover:bg-primary/80 text-primary-foreground',
    secondary: 'bg-secondary hover:bg-secondary/80 dark:bg-secondary dark:hover:bg-secondary/80',
  },

  // Composer (input area at bottom)
  composer: {
    background: 'bg-card dark:bg-card',
    border: 'border-border dark:border-border',
    buttonBackground: 'bg-primary',
    buttonHover: 'hover:bg-primary/80',
  },

  // Sidebar (conversations list)
  sidebar: {
    background: 'bg-card dark:bg-card',
    itemActive: 'bg-primary/10 dark:bg-primary/20',
    itemHover: 'hover:bg-muted dark:hover:bg-muted',
    border: 'border-border dark:border-border',
  },

  // General borders
  border: 'border-border dark:border-border',
}
