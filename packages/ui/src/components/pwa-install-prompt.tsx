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
}

export function PWAInstallPrompt({
  appName = 'Cette application',
  description = 'Installez l\'application pour un accès rapide et une meilleure expérience',
  installButtonText = 'Installer',
  laterButtonText = 'Plus tard',
  className = ''
}: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (typeof window !== 'undefined') {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
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
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log(`PWA ${appName} installée avec succès!`)
        setIsInstalled(true)
      } else {
        console.log(`Installation PWA ${appName} annulée`)
      }
    } catch (error) {
      console.error('Erreur lors de l\'installation PWA:', error)
    }

    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    setIsDismissed(true)
  }

  // Bouton de test temporaire en développement
  const isDev = process.env.NODE_ENV === 'development'

  // Ne pas afficher si l'app est déjà installée ou si pas de prompt (sauf en dev)
  if (isInstalled || (!showInstallPrompt && !isDev) || (isDev && isDismissed)) {
    return null
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Installer {appName}
            {isDev && !showInstallPrompt && (
              <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded">
                DEV TEST
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {isDev && !showInstallPrompt 
              ? "Mode développement - Le navigateur n'a pas déclenché l'événement beforeinstallprompt"
              : description
            }
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
            disabled={!isDev && !deferredPrompt}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {installButtonText}
          </Button>
        </div>
      </div>
    </div>
  )
}