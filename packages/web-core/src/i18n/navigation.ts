import { createNavigation } from 'next-intl/navigation'
import { defaultRouting } from './routing'

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(defaultRouting)

// Fonction pour créer une navigation personnalisée si besoin
export function createCustomNavigation(routing: any) {
  return createNavigation(routing)
}