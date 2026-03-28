import { ThreadTheme } from './types';

/**
 * Predefined thread themes
 * Apps can use these directly or customize them
 */

export const threadThemes: Record<string, ThreadTheme> = {
  blue: {
    background: 'bg-blue-50 dark:bg-slate-950',
    message: {
      user: {
        background: 'bg-blue-500',
        text: 'text-white',
      },
      ai: {
        background: 'bg-white dark:bg-slate-800',
        text: 'text-slate-900 dark:text-slate-100',
      },
    },
    button: {
      primary: 'bg-blue-500 hover:bg-blue-600',
      secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600',
    },
    composer: {
      background: 'bg-white dark:bg-slate-900',
      border: 'border-blue-200 dark:border-slate-700',
      buttonBackground: 'bg-blue-500',
      buttonHover: 'hover:bg-blue-600',
    },
    sidebar: {
      background: 'bg-white dark:bg-slate-900',
      itemActive: 'bg-blue-100 dark:bg-slate-800',
      itemHover: 'hover:bg-blue-50 dark:hover:bg-slate-800',
      border: 'border-blue-200 dark:border-slate-700',
    },
    border: 'border-blue-200 dark:border-slate-700',
  },

  green: {
    background: 'bg-green-50 dark:bg-slate-950',
    message: {
      user: {
        background: 'bg-green-600',
        text: 'text-white',
      },
      ai: {
        background: 'bg-white dark:bg-slate-800',
        text: 'text-slate-900 dark:text-slate-100',
      },
    },
    button: {
      primary: 'bg-green-600 hover:bg-green-700',
      secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600',
    },
    composer: {
      background: 'bg-white dark:bg-slate-900',
      border: 'border-green-200 dark:border-slate-700',
      buttonBackground: 'bg-green-600',
      buttonHover: 'hover:bg-green-700',
    },
    sidebar: {
      background: 'bg-white dark:bg-slate-900',
      itemActive: 'bg-green-100 dark:bg-slate-800',
      itemHover: 'hover:bg-green-50 dark:hover:bg-slate-800',
      border: 'border-green-200 dark:border-slate-700',
    },
    border: 'border-green-200 dark:border-slate-700',
  },

  purple: {
    background: 'bg-purple-50 dark:bg-slate-950',
    message: {
      user: {
        background: 'bg-purple-500',
        text: 'text-white',
      },
      ai: {
        background: 'bg-white dark:bg-slate-800',
        text: 'text-slate-900 dark:text-slate-100',
      },
    },
    button: {
      primary: 'bg-purple-500 hover:bg-purple-600',
      secondary: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600',
    },
    composer: {
      background: 'bg-white dark:bg-slate-900',
      border: 'border-purple-200 dark:border-slate-700',
      buttonBackground: 'bg-purple-500',
      buttonHover: 'hover:bg-purple-600',
    },
    sidebar: {
      background: 'bg-white dark:bg-slate-900',
      itemActive: 'bg-purple-100 dark:bg-slate-800',
      itemHover: 'hover:bg-purple-50 dark:hover:bg-slate-800',
      border: 'border-purple-200 dark:border-slate-700',
    },
    border: 'border-purple-200 dark:border-slate-700',
  },

  neutral: {
    background: 'bg-background',
    message: {
      user: {
        background: 'bg-primary',
        text: 'text-primary-foreground',
      },
      ai: {
        background: 'bg-muted',
        text: 'text-foreground',
      },
    },
    button: {
      primary: 'bg-primary hover:bg-primary/90',
      secondary: 'bg-secondary hover:bg-secondary/80',
    },
    composer: {
      background: 'bg-background',
      border: 'border',
      buttonBackground: 'bg-primary',
      buttonHover: 'hover:bg-primary/90',
    },
    sidebar: {
      background: 'bg-background',
      itemActive: 'bg-accent',
      itemHover: 'hover:bg-accent/50',
      border: 'border',
    },
    border: 'border',
  },
};

/**
 * Get a theme by name or return neutral as default
 */
export function getThreadTheme(colorScheme?: string): ThreadTheme {
  if (!colorScheme || colorScheme === 'custom') {
    return threadThemes.neutral as ThreadTheme;
  }
  return (threadThemes[colorScheme] as ThreadTheme) || (threadThemes.neutral as ThreadTheme);
}

/**
 * Merge custom theme with a base theme
 */
export function mergeThreadTheme(
  base: ThreadTheme,
  custom?: Partial<ThreadTheme>
): ThreadTheme {
  if (!custom) return base;

  return {
    background: custom.background || base.background,
    message: {
      user: {
        background: custom.message?.user?.background || base.message?.user?.background,
        text: custom.message?.user?.text || base.message?.user?.text,
        border: custom.message?.user?.border || base.message?.user?.border,
      },
      ai: {
        background: custom.message?.ai?.background || base.message?.ai?.background,
        text: custom.message?.ai?.text || base.message?.ai?.text,
        border: custom.message?.ai?.border || base.message?.ai?.border,
      },
    },
    button: {
      primary: custom.button?.primary || base.button?.primary,
      secondary: custom.button?.secondary || base.button?.secondary,
      hover: custom.button?.hover || base.button?.hover,
    },
    composer: {
      background: custom.composer?.background || base.composer?.background,
      border: custom.composer?.border || base.composer?.border,
      buttonBackground:
        custom.composer?.buttonBackground || base.composer?.buttonBackground,
      buttonHover: custom.composer?.buttonHover || base.composer?.buttonHover,
    },
    sidebar: {
      background: custom.sidebar?.background || base.sidebar?.background,
      itemActive: custom.sidebar?.itemActive || base.sidebar?.itemActive,
      itemHover: custom.sidebar?.itemHover || base.sidebar?.itemHover,
      border: custom.sidebar?.border || base.sidebar?.border,
    },
    border: custom.border || base.border,
  };
}
