'use client'

import { Button, Dropdown, type DropdownItem, Icon } from '@ezstart/ui/components'
import { useAuth } from '../provider.js'
import { UserAvatar } from './UserAvatar.js'
import { Div, Span } from '@ezstart/ui/components'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserMenuItem {
  /** Display label */
  label: string
  /** Navigation href (rendered as onClick with window.location) */
  href?: string
  /** Lucide icon name (e.g. 'lucide:Settings') */
  icon?: string
  /** Click handler */
  onClick?: () => void
  /** Renders a separator before this item */
  separator?: boolean
}

export interface UserMenuTexts {
  signIn: string
  signOut: string
  profile: string
  settings: string
  themeLight: string
  themeDark: string
  themeSystem: string
}

export interface UserMenuProps {
  /** Show dark/light/system theme toggle */
  showThemeToggle?: boolean
  /** Show language selector */
  showLanguageSelector?: boolean
  /** Available languages for selector */
  languages?: { code: string; label: string }[]
  /** Current locale code */
  currentLocale?: string
  /** Locale change handler */
  onLocaleChange?: (locale: string) => void
  /** Custom menu items injected by the app */
  extraItems?: UserMenuItem[]
  /** Additional class name on the root container */
  className?: string
  /** Override default texts */
  texts?: Partial<UserMenuTexts>
  /** Avatar trigger size */
  avatarSize?: 'sm' | 'md' | 'lg'
  /** Theme getter — pass `useTheme()` result to avoid hard dep on next-themes */
  theme?: { theme?: string; setTheme: (t: string) => void }
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: UserMenuTexts = {
  signIn: 'Sign in',
  signOut: 'Sign out',
  profile: 'Profile',
  settings: 'Settings',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserMenu({
  showThemeToggle = false,
  showLanguageSelector = false,
  languages,
  currentLocale,
  onLocaleChange,
  extraItems,
  className,
  texts: textOverrides,
  avatarSize = 'md',
  theme,
}: UserMenuProps) {
  const { user, isAuthenticated, login, logout, isLoggingIn } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }

  // ── Not authenticated: show sign-in button ──
  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="default"
        size="default"
        className={className}
        onClick={() => login()}
        disabled={isLoggingIn}
      >
        <Icon name="lucide:LogIn" className="w-4 h-4 mr-2" />
        {isLoggingIn ? '...' : texts.signIn}
      </Button>
    )
  }

  // ── Build dropdown items ──
  const items: DropdownItem[] = []

  // User info header (non-interactive)
  items.push({
    label: (
      <Div className="flex items-center gap-3 py-1 pointer-events-none">
        <UserAvatar size="sm" user={user} />
        <Div className="flex flex-col min-w-0">
          <Span className="text-sm font-medium text-foreground truncate">
            {user.firstName
              ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
              : user.username}
          </Span>
          <Span className="text-xs text-muted-foreground truncate">{user.email}</Span>
        </Div>
      </Div>
    ),
    value: '_user-info',
    disabled: true,
    divider: true,
  })

  // Extra items from the app
  if (extraItems && extraItems.length > 0) {
    extraItems.forEach((item, index) => {
      if (item.separator && index > 0) {
        // Mark divider on previous item
        const prevItem = items[items.length - 1]
        if (prevItem) prevItem.divider = true
      }

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

    // Divider after extra items
    const lastExtra = items[items.length - 1]
    if (lastExtra) lastExtra.divider = true
  }

  // Theme toggle
  if (showThemeToggle && theme) {
    const currentTheme = theme.theme || 'system'
    const themeOptions = [
      { value: 'light', label: texts.themeLight, icon: 'lucide:Sun' },
      { value: 'dark', label: texts.themeDark, icon: 'lucide:Moon' },
      { value: 'system', label: texts.themeSystem, icon: 'lucide:Monitor' },
    ] as const

    themeOptions.forEach(opt => {
      items.push({
        label: (
          <Span className="flex items-center gap-2">
            <Span className="text-sm">{opt.label}</Span>
            {currentTheme === opt.value && (
              <Icon name="lucide:Check" className="w-3 h-3 text-primary ml-auto" />
            )}
          </Span>
        ),
        value: `theme-${opt.value}`,
        icon: <Icon name={opt.icon} className="w-4 h-4" />,
        onSelect: () => theme.setTheme(opt.value),
      })
    })

    const lastTheme = items[items.length - 1]
    if (lastTheme) lastTheme.divider = true
  }

  // Language selector
  if (showLanguageSelector && languages && languages.length > 0 && onLocaleChange) {
    languages.forEach(lang => {
      items.push({
        label: (
          <Span className="flex items-center gap-2">
            <Span className="text-sm">{lang.label}</Span>
            {currentLocale === lang.code && (
              <Icon name="lucide:Check" className="w-3 h-3 text-primary ml-auto" />
            )}
          </Span>
        ),
        value: `lang-${lang.code}`,
        icon: <Icon name="lucide:Globe" className="w-4 h-4" />,
        onSelect: () => onLocaleChange(lang.code),
      })
    })

    const lastLang = items[items.length - 1]
    if (lastLang) lastLang.divider = true
  }

  // Sign out
  items.push({
    label: texts.signOut,
    value: '_sign-out',
    icon: <Icon name="lucide:LogOut" className="w-4 h-4 text-destructive" />,
    onSelect: () => logout(),
  })

  // ── Render ──
  return (
    <Dropdown
      trigger={
        <button
          type="button"
          className="rounded-full ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="User menu"
        >
          <UserAvatar size={avatarSize} user={user} />
        </button>
      }
      items={items}
      align="end"
      side="bottom"
      menuClassName="min-w-[220px]"
      className={className}
    />
  )
}
