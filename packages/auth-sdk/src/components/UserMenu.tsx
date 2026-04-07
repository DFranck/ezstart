'use client'

import { useState } from 'react'
import { Button, Dropdown, type DropdownItem, Icon, Div, Span } from '@ezstart/ui/components'
import { useAuth } from '../provider.js'
import { UserAvatar } from './UserAvatar.js'
import { AccountModal } from './AccountModal.js'

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
  manageAccount: string
}

export interface UserMenuProps {
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
  /** Override "Manage account" behavior (e.g. navigate to settings page) */
  onManageAccount?: () => void
  /** Override texts for AccountModal */
  accountModalTexts?: Record<string, string>
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: UserMenuTexts = {
  signIn: 'Sign in',
  signOut: 'Sign out',
  manageAccount: 'Manage account',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserMenu({
  languages,
  currentLocale,
  onLocaleChange,
  extraItems,
  className,
  texts: textOverrides,
  avatarSize = 'md',
  theme,
  onManageAccount,
  accountModalTexts,
}: UserMenuProps) {
  const { user, isAuthenticated, login, logout, isLoggingIn } = useAuth()
  const texts = { ...DEFAULT_TEXTS, ...textOverrides }
  const [showAccount, setShowAccount] = useState(false)

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

  const fullName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.username

  // ── Build dropdown items ──
  const items: DropdownItem[] = []

  // 1. Header: avatar + name + email (non-clickable)
  items.push({
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
  })

  // 2. Manage account
  items.push({
    label: texts.manageAccount,
    value: '_manage-account',
    icon: <Icon name="lucide:Settings" className="w-4 h-4" />,
    onSelect: () => {
      if (onManageAccount) {
        onManageAccount()
      } else {
        setShowAccount(true)
      }
    },
  })

  // 3. Extra items from the app
  if (extraItems && extraItems.length > 0) {
    extraItems.forEach((item, index) => {
      if (item.separator && index > 0) {
        const prevItem = items[items.length - 1]
        if (prevItem) prevItem.divider = true
      }

      items.push({
        label: item.label,
        value: `extra-${index}`,
        icon: item.icon ? (
          <Icon name={item.icon as 'lucide:LogIn'} className="w-4 h-4" />
        ) : undefined,
        onSelect: () => {
          if (item.onClick) item.onClick()
          if (item.href) window.location.href = item.href
        },
      })
    })
  }

  // 4. Divider + Sign out (destructive)
  const lastItem = items[items.length - 1]
  if (lastItem) lastItem.divider = true

  items.push({
    label: <Span className="text-destructive">{texts.signOut}</Span>,
    value: '_sign-out',
    icon: <Icon name="lucide:LogOut" className="w-4 h-4 text-destructive" />,
    onSelect: () => logout(),
  })

  // ── Render ──
  return (
    <>
      <Dropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full cursor-pointer"
            aria-label="User menu"
          >
            <UserAvatar size={avatarSize} user={user} />
          </Button>
        }
        items={items}
        align="end"
        side="bottom"
        menuClassName="min-w-[240px]"
        className={className}
      />
      <AccountModal
        open={showAccount}
        onClose={() => setShowAccount(false)}
        texts={accountModalTexts}
        theme={theme}
        languages={languages}
        currentLocale={currentLocale}
        onLocaleChange={onLocaleChange}
      />
    </>
  )
}
