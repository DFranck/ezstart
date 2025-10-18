'use client'

import { useEffect, useState } from 'react'
import { Button } from './button'

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
}

export function PWAInstallPrompt({
  appName = 'This app',
  description = 'Install the app for quick access and a better experience',
  installButtonText = 'Install',
  laterButtonText = 'Later',
  className = '',
  showInDev = false
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
        console.log(`PWA ${appName} installed successfully!`)
        setIsInstalled(true)
      } else {
        console.log(`PWA ${appName} installation cancelled`)
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    setIsDismissed(true)
  }

  // Don't show if app is already installed or no install prompt available
  if (isInstalled || !showInstallPrompt) {
    return null
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Install {appName}
            {isDev && showInDev && (
              <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded">
                DEV MODE
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {isDev && showInDev && !showInstallPrompt
              ? "Dev mode active - Browser hasn't triggered beforeinstallprompt event yet"
              : description}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDismiss}
            className="text-gray-600 dark:text-gray-300"
          >
            {laterButtonText}
          </Button>
          <Button
            size="sm"
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {installButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}