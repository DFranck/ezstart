'use client'

import { useMessages } from 'next-intl'

export type NavMenu = {
  menuLabel: string
  menu: { label: string; href: string }[]
}
export type NavLink = { label: string; href: string }
export type NavItem = NavLink | NavMenu

export const useNavLinks = (): NavItem[] => {
  // SSR-safe messages handling
  let messages: Record<string, any> = {}
  try {
    messages = useMessages() as Record<string, any>
  } catch (error) {
    console.warn('useMessages failed in useNavLinks, using fallback:', error)
    // Return empty array as fallback
    return []
  }

  return Array.isArray(messages.links) ? messages.links : []
}
