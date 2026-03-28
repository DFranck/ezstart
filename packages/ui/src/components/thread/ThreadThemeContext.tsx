'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ThreadTheme, ColorScheme } from './types';
import { getThreadTheme, mergeThreadTheme } from './thread-themes';

type ThreadThemeContextValue = {
  theme: ThreadTheme;
  colorScheme?: ColorScheme;
};

const ThreadThemeContext = createContext<ThreadThemeContextValue | undefined>(undefined);

type ThreadThemeProviderProps = {
  children: ReactNode;
  colorScheme?: ColorScheme;
  customTheme?: Partial<ThreadTheme>;
};

export function ThreadThemeProvider({
  children,
  colorScheme = 'neutral',
  customTheme,
}: ThreadThemeProviderProps) {
  const baseTheme = getThreadTheme(colorScheme);
  const theme = customTheme ? mergeThreadTheme(baseTheme, customTheme) : baseTheme;

  return (
    <ThreadThemeContext.Provider value={{ theme, colorScheme }}>
      {children}
    </ThreadThemeContext.Provider>
  );
}

export function useThreadTheme() {
  const context = useContext(ThreadThemeContext);
  if (!context) {
    // Return neutral theme as fallback if used outside provider
    return { theme: getThreadTheme('neutral'), colorScheme: 'neutral' as ColorScheme };
  }
  return context;
}
