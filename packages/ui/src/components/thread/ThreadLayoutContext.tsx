'use client';

import { createContext, useContext } from 'react';

type ThreadLayoutContextValue = {
  closeSidebar: () => void;
};

const ThreadLayoutContext = createContext<ThreadLayoutContextValue | undefined>(undefined);

export const ThreadLayoutProvider = ThreadLayoutContext.Provider;

export function useThreadLayout() {
  const context = useContext(ThreadLayoutContext);
  return context;
}
