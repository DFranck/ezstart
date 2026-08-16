'use client'

import { Button, Div, Icon, Span } from '@ezstart/ui/components'

/**
 * Props for the signed-out `<UserMenu>` trigger.
 *
 * @internal
 */
export interface UserMenuSignedOutTriggerProps {
  variant: 'icon' | 'extended'
  avatarSize: 'sm' | 'md' | 'lg'
  signInLabel: string
  isLoggingIn: boolean
  className?: string
  onClick: () => void
}

/**
 * Signed-out trigger for `<UserMenu>` (V1). Mirrors the authenticated trigger
 * shape — `'icon'` renders a round avatar-sized button, `'extended'` renders
 * the same horizontal row (avatar circle + label column) with a placeholder
 * avatar + "Sign in" label. Keeping the chrome stable across auth state
 * changes avoids an unmount/remount that would interrupt in-flight toasts.
 *
 * @internal
 */
export function UserMenuSignedOutTrigger({
  variant,
  avatarSize,
  signInLabel,
  isLoggingIn,
  className,
  onClick,
}: UserMenuSignedOutTriggerProps) {
  if (variant === 'icon') {
    return (
      <Button
        variant="default"
        size="icon"
        className={`rounded-full cursor-pointer ${className ?? ''}`.trim()}
        aria-label={signInLabel}
        onClick={onClick}
        disabled={isLoggingIn}
      >
        <Icon
          name={isLoggingIn ? 'fa:FaSpinner' : 'fa:FaUser'}
          spin={isLoggingIn}
          className="w-5 h-5"
        />
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      className={`w-full justify-start h-auto py-2 px-2 cursor-pointer ${className ?? ''}`.trim()}
      aria-label={signInLabel}
      onClick={onClick}
      disabled={isLoggingIn}
    >
      <Div className="flex items-center gap-2 w-full min-w-0">
        <Div
          className={`flex items-center justify-center rounded-full ${
            avatarSize === 'lg' ? 'h-10 w-10' : avatarSize === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
          }`}
        >
          <Icon
            name={isLoggingIn ? 'fa:FaSpinner' : 'fa:FaUser'}
            spin={isLoggingIn}
            className="w-4 h-4"
          />
        </Div>
        <Span className="text-sm font-medium truncate text-left">{signInLabel}</Span>
      </Div>
    </Button>
  )
}
