'use client'

import { Div, type DropdownItem, Icon, Span } from '@ezstart/ui/components'
import type { AuthUser } from '../../core/types.js'
import { UserAvatar } from '../UserAvatar.js'
import type { UserMenuItem, UserMenuTexts } from './types.js'

/**
 * Inputs needed to build the authenticated `<UserMenu>` (V1) dropdown items.
 *
 * @internal
 */
export interface BuildUserMenuItemsArgs {
  user: AuthUser
  texts: UserMenuTexts
  isLoggingOut: boolean
  extraItems?: UserMenuItem[]
  theme?: { theme?: string; setTheme: (t: string) => void }
  languages?: { code: string; label: string }[]
  currentLocale?: string
  onLocaleChange?: (locale: string) => void
  onManageAccount?: () => void
  onOpenAccount: () => void
  onLogout: () => void
}

/** Mark the most recently pushed item as a group separator boundary. @internal */
function divideAfterLast(items: DropdownItem[]): void {
  const prev = items[items.length - 1]
  if (prev) prev.divider = true
}

/** Header: avatar + name + email (non-clickable). @internal */
function buildHeader(user: AuthUser): DropdownItem {
  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username
  return {
    label: (
      <Div className="flex items-center gap-2 pointer-events-none">
        <UserAvatar size="sm" user={user} />
        <Div className="flex flex-col min-w-0">
          <Span className="text-sm font-medium text-foreground truncate">{fullName}</Span>
          <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
        </Div>
      </Div>
    ),
    value: '_user-info',
    disabled: true,
    divider: true,
  }
}

/** Consumer-injected extra rows. @internal */
function pushExtraItems(items: DropdownItem[], extraItems?: UserMenuItem[]): void {
  if (!extraItems || extraItems.length === 0) return
  extraItems.forEach((item, index) => {
    if (item.separator && index > 0) divideAfterLast(items)
    items.push({
      label: item.label,
      value: `extra-${index}`,
      icon: item.icon ? <Icon name={item.icon as 'lucide:LogIn'} className="w-4 h-4" /> : undefined,
      onSelect: () => {
        if (item.onClick) item.onClick()
        if (item.href) window.location.href = item.href
      },
    })
  })
}

/** Theme toggle row — cycles light → dark → system. @internal */
function pushThemeRow(
  items: DropdownItem[],
  texts: UserMenuTexts,
  theme: { theme?: string; setTheme: (t: string) => void }
): void {
  const currentTheme = theme.theme ?? 'system'
  const nextTheme = currentTheme === 'light' ? 'dark' : currentTheme === 'dark' ? 'system' : 'light'
  const themeIcon =
    currentTheme === 'dark'
      ? 'lucide:Moon'
      : currentTheme === 'light'
        ? 'lucide:Sun'
        : 'lucide:Monitor'
  const themeLabel =
    currentTheme === 'dark'
      ? texts.themeDark
      : currentTheme === 'light'
        ? texts.themeLight
        : texts.themeSystem
  items.push({
    label: (
      <Div className="flex items-center justify-between gap-2 w-full">
        <Span className="text-sm">{texts.themeLabel}</Span>
        <Span className="text-xs text-muted-foreground">{themeLabel}</Span>
      </Div>
    ),
    value: '_theme-toggle',
    icon: <Icon name={themeIcon} className="w-4 h-4" />,
    onSelect: () => theme.setTheme(nextTheme),
  })
}

/** Locale switcher rows — one per available language. @internal */
function pushLocaleRows(
  items: DropdownItem[],
  languages: { code: string; label: string }[],
  currentLocale: string | undefined,
  onLocaleChange: (locale: string) => void
): void {
  languages.forEach(lang => {
    const isCurrent = lang.code === currentLocale
    items.push({
      label: (
        <Div className="flex items-center justify-between gap-2 w-full">
          <Span className="text-sm">{lang.label}</Span>
          {isCurrent ? <Icon name="lucide:Check" className="w-4 h-4 text-primary" /> : null}
        </Div>
      ),
      value: `_locale-${lang.code}`,
      icon: <Icon name="lucide:Globe" className="w-4 h-4" />,
      onSelect: () => {
        if (!isCurrent) onLocaleChange(lang.code)
      },
    })
  })
}

/**
 * Embedded personalization switchers (theme + locale). Each is only rendered
 * when the consumer passes the matching config props. Mirrors the Stripe /
 * Clerk pattern where the user menu surfaces theme + locale toggles.
 *
 * @internal
 */
function pushPersonalization(items: DropdownItem[], args: BuildUserMenuItemsArgs): void {
  const { texts, theme, languages, currentLocale, onLocaleChange } = args
  const hasThemeSwitcher = !!theme && typeof theme.setTheme === 'function'
  const hasLocaleSwitcher = Array.isArray(languages) && languages.length > 1 && !!onLocaleChange

  if (hasThemeSwitcher || hasLocaleSwitcher) divideAfterLast(items)
  if (hasThemeSwitcher && theme) pushThemeRow(items, texts, theme)
  if (hasLocaleSwitcher && languages && onLocaleChange) {
    pushLocaleRows(items, languages, currentLocale, onLocaleChange)
  }
}

/** Divider + destructive sign-out row. @internal */
function pushSignOut(
  items: DropdownItem[],
  texts: UserMenuTexts,
  isLoggingOut: boolean,
  onLogout: () => void
): void {
  divideAfterLast(items)
  items.push({
    label: (
      <Span className="text-destructive">{isLoggingOut ? texts.signingOut : texts.signOut}</Span>
    ),
    value: '_sign-out',
    icon: (
      <Icon
        name={isLoggingOut ? 'fa:FaSpinner' : 'lucide:LogOut'}
        spin={isLoggingOut}
        className="w-4 h-4 text-destructive"
      />
    ),
    disabled: isLoggingOut,
    onSelect: onLogout,
  })
}

/**
 * Build the full authenticated `<UserMenu>` (V1) dropdown items list. The order
 * (header → manage account → extra items → personalization → sign out) and the
 * divider boundaries are preserved exactly from the original inline impl.
 *
 * @internal
 */
export function buildUserMenuItems(args: BuildUserMenuItemsArgs): DropdownItem[] {
  const { user, texts, isLoggingOut, extraItems, onManageAccount, onOpenAccount, onLogout } = args
  const items: DropdownItem[] = []

  items.push(buildHeader(user))

  items.push({
    label: texts.manageAccount,
    value: '_manage-account',
    icon: <Icon name="lucide:Settings" className="w-4 h-4" />,
    onSelect: () => {
      if (onManageAccount) onManageAccount()
      else onOpenAccount()
    },
  })

  pushExtraItems(items, extraItems)
  pushPersonalization(items, args)
  pushSignOut(items, texts, isLoggingOut, onLogout)

  return items
}
