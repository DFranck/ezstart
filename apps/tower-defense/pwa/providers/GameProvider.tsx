'use client'

import { ReactNode } from 'react'

export function GameProvider({ children }: { children: ReactNode }) {
  // Optionnel : log state changes ou init socket ici
  return children
}
