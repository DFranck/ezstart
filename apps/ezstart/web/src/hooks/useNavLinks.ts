'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { logger } from '@ezstart/logger'
import { useRBAC } from '@ezstart/auth-sdk'
import { useMessages } from 'next-intl'

export type NavMenu = {
  menuLabel: string
  menu: { label: string; href: string }[]
}
export type NavLink = { label: string; href: string }
export type NavItem = NavLink | NavMenu

export const useNavLinks = (): NavItem[] => {
  // Get user and RBAC
  const { user } = useAuthStore()
  const rbac = useRBAC(user, 'ezstart')

  // SSR-safe messages handling
  let messages: Record<string, any> = {}
  try {
    messages = useMessages() as Record<string, any>
  } catch (error) {
    logger.warn('useMessages failed in useNavLinks, using fallback:', error)
    // Return empty array as fallback
    return []
  }

  const baseLinks = Array.isArray(messages.links) ? messages.links : []

  // Add Admin link only for superadmins
  if (rbac.hasRole('superadmin')) {
    return [
      ...baseLinks,
      {
        label: 'Admin',
        href: '/admin',
      },
    ]
  }

  return baseLinks
}
