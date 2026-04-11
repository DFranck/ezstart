'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import type { PiPConfig } from '../types'

// Extend Window for Document Picture-in-Picture API (Chrome 116+)
interface DocumentPiPWindow {
  document: Document
  close: () => void
  addEventListener: (event: string, handler: () => void) => void
  removeEventListener: (event: string, handler: () => void) => void
}

interface DocumentPiPAPI {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<DocumentPiPWindow>
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPiPAPI
  }
}

interface UsePiPReturn {
  isSupported: boolean
  isOpen: boolean
  open: (content: ReactNode) => Promise<void>
  close: () => void
  update: (content: ReactNode) => void
  /** Portal element to render content into (use with createPortal) */
  portalContainer: HTMLElement | null
}

/**
 * Picture-in-Picture overlay hook.
 * Uses the Document Picture-in-Picture API (Chrome 116+) when available,
 * falls back to a portal-based floating div for unsupported browsers.
 */
export function usePiP(config?: PiPConfig): UsePiPReturn {
  const { width = 300, height = 200 } = config ?? {}

  const [isOpen, setIsOpen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  const pipWindowRef = useRef<DocumentPiPWindow | null>(null)
  const fallbackRef = useRef<HTMLDivElement | null>(null)

  // Check support after mount (SSR-safe)
  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'documentPictureInPicture' in window)
  }, [])

  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      pipWindowRef.current.close()
      pipWindowRef.current = null
    }

    if (fallbackRef.current) {
      fallbackRef.current.remove()
      fallbackRef.current = null
    }

    setPortalContainer(null)
    setIsOpen(false)
  }, [])

  const openPiP = useCallback(
    async (_content: ReactNode) => {
      // Close existing PiP if open
      closePiP()

      if (typeof window !== 'undefined' && window.documentPictureInPicture) {
        // Native Document PiP API
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width,
          height,
        })
        pipWindowRef.current = pipWindow

        // Copy stylesheets from parent document
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
        for (const style of styles) {
          pipWindow.document.head.appendChild(style.cloneNode(true))
        }

        const container = pipWindow.document.createElement('div')
        pipWindow.document.body.appendChild(container)

        pipWindow.addEventListener('pagehide', () => {
          closePiP()
        })

        setPortalContainer(container)
        setIsOpen(true)
      } else {
        // Fallback: floating div overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = [
          'position: fixed',
          'bottom: 16px',
          'right: 16px',
          `width: ${width}px`,
          `height: ${height}px`,
          'z-index: 99999',
          'background: var(--background, #fff)',
          'border: 1px solid var(--border, #e5e7eb)',
          'border-radius: 8px',
          'box-shadow: 0 8px 32px rgba(0,0,0,0.15)',
          'overflow: hidden',
        ].join(';')

        document.body.appendChild(overlay)
        fallbackRef.current = overlay

        setPortalContainer(overlay)
        setIsOpen(true)
      }
    },
    [width, height, closePiP]
  )

  const updatePiP = useCallback((_content: ReactNode) => {
    // Content updates are handled automatically via React portal
    // The consumer renders into portalContainer using createPortal
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return closePiP
  }, [closePiP])

  return {
    isSupported,
    isOpen,
    open: openPiP,
    close: closePiP,
    update: updatePiP,
    portalContainer,
  }
}

// Re-export createPortal for convenience
export { createPortal }
