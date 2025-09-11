'use client'

import type { VariantProps } from 'class-variance-authority'
import { Button } from './button'
import { Icon, type KnownIconName } from './icon'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

type ButtonVariantProps = VariantProps<typeof import('./button').buttonVariants>

export interface BackButtonProps
  extends Omit<React.ComponentProps<'button'>, 'onClick'>,
    ButtonVariantProps {
  onClick?: () => void
  icon?: KnownIconName
  title?: string
}

export function BackButton({
  onClick,
  icon = 'fa:FaArrowLeft',
  title,
  variant = 'ghost',
  size = 'sm',
  className,
  ...props
}: BackButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
      return
    }

    // Smart navigation logic
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const redirectUri = urlParams.get('redirect_uri')
      const app = urlParams.get('app')

      if (redirectUri) {
        // OAuth/auth flow detected - go back to origin app
        try {
          const url = new URL(redirectUri)
          window.location.href = url.origin
          return
        } catch (error) {
          console.error('Invalid redirect_uri:', redirectUri)
        }
      }

      // Default: browser back navigation
      window.history.back()
    }
  }

  // Auto-generate title if not provided
  const getTitle = () => {
    if (title) return title

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const app = urlParams.get('app')
      if (app) return `Back to ${app}`
    }

    return 'Go back'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={className}
            {...props}
          >
            <Icon name={icon} className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{getTitle()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
