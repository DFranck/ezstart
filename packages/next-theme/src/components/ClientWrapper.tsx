'use client'

import { ReactNode } from 'react'

export interface ClientWrapperProps {
  children: ReactNode
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return <>{children}</>
}