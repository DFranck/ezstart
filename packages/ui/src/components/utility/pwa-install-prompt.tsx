'use client'

import { logger } from '@ezstart/logger'
import { type ReactNode, useEffect, useState } from 'react'
import { Badge } from '../data-display/badge'
import { Button } from '../button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallPromptProps {
  appName?: string
  description?: string
  installButtonText?: string
  laterButtonText?: string
  className?: string
  /** Show prompt in development mode (default: false) */
  showInDev?: boolean
  /** Hide the title (default: false) */
  hideTitle?: boolean
  /** Hide the description (default: false) */
  hideDescription?: boolean
  /** Hide the "Later" button (default: false) */
  hideLater?: boolean
  /** Fallback content when PWA is not installable */
  fallback?: ReactNode
  /** Render as inline (no fixed positioning) instead of fixed bottom bar */
  inline?: boolean
}

export function PWAInstallPrompt({
  appName = 'Install This app',
  description = 'Install the app for quick access and a better experience',
  installButtonText = 'Install',
  laterButtonText = 'Later',
  className = '',
  showInDev = false,
  hideTitle = false,
  hideDescription = false,
  hideLater = false,
  fallback,
  inline = false,
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const isDev = process.env.NODE_ENV === 'development'

  useEffect(() => {
    // Skip in development unless showInDev is true
    if (isDev && !showInDev) {
      return
    }

    // Check if app is already installed
    if (typeof window !== 'undefined') {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
    }

    // In dev mode with showInDev, force show the prompt for testing
    if (isDev && showInDev) {
      setShowInstallPrompt(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.addEventListener('appinstalled', handleAppInstalled)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, [isDev, showInDev])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        logger.info(`PWA ${appName} installed successfully!`)
        setIsInstalled(true)
      } else {
        logger.info(`PWA ${appName} installation cancelled`)
      }
    } catch (error) {
      logger.error('Error installing PWA:', error instanceof Error ? error.message : String(error))
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    setIsDismissed(true)
  }

  // Already installed — show nothing
  if (isInstalled) {
    return null
  }

  // Not installable — show fallback if provided
  if (!showInstallPrompt) {
    return fallback ? <>{fallback}</> : null
  }

  // Installable — render install prompt
  const containerClass = inline
    ? `${className}`
    : `fixed bottom-4 left-4 right-4 z-50 bg-card text-card-foreground rounded-lg shadow-lg border p-4 ${className}`

  return (
    <div className={containerClass}>
      <div className={inline ? 'flex flex-col gap-2' : 'flex items-center justify-between'}>
        {(!hideTitle || !hideDescription) && (
          <div className="flex-1">
            {!hideTitle && (
              <h3 className="text-lg font-semibold">
                {appName}
                {isDev && showInDev && (
                  <Badge variant="warning" className="ml-2">
                    DEV
                  </Badge>
                )}
              </h3>
            )}
            {!hideDescription && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}
        <div className={`flex gap-2 ${!hideTitle && !hideDescription && !inline ? 'ml-4' : ''}`}>
          {!hideLater && (
            <Button variant="outline" size="sm" onClick={handleDismiss}>
              {laterButtonText}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            className={inline ? 'w-full' : ''}
          >
            {installButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}
