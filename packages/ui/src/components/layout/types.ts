import type { KnownIconName } from '../icon/src/types'

export type LayoutIconName = KnownIconName

export interface NavigationItem {
  href: string
  label: string
  icon?: LayoutIconName
}

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