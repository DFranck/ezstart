import type { KnownIconName } from '../icon/src/types'

export type LayoutIconName = KnownIconName

export interface NavigationItem {
  href: string
  label: string
  icon?: LayoutIconName
}

export interface NavigationMenu {
  menuLabel: string
  icon?: LayoutIconName
  menu: NavigationItem[]
}

export type NavigationLink = NavigationItem | NavigationMenu

export interface BottomNavItem {
  href: string
  icon: LayoutIconName
  label: string
}

export interface SocialLink {
  href: string
  icon: LayoutIconName
  label: string
}

export interface FooterLink {
  href: string
  label: string
}

// Type guards
export function isNavigationMenu(link: NavigationLink): link is NavigationMenu {
  return 'menuLabel' in link && 'menu' in link
}

export function isNavigationItem(link: NavigationLink): link is NavigationItem {
  return 'href' in link && 'label' in link
}
