'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog'
import { Button } from '../button'
import { Checkbox } from '../forms/checkbox'
import { Label } from '../forms/label'

/**
 * WelcomeModal Component - First-time user onboarding
 *
 * Shows a welcome message to new users with app features and getting started info.
 * Stores "seen" state in localStorage to avoid showing again.
 *
 * @example
 * <WelcomeModal
 *   appName="EZBill"
 *   title="Welcome to EZBill!"
 *   description="Professional invoicing made simple"
 *   features={[
 *     { icon: "lucide:FileText", title: "Create Invoices", description: "Generate professional invoices in seconds" },
 *     { icon: "lucide:Users", title: "Manage Clients", description: "Keep track of all your clients" },
 *   ]}
 *   ctaText="Get Started"
 *   onClose={handleClose}
 * />
 */

export interface WelcomeFeature {
  icon: string
  title: string
  description: string
}

export interface WelcomeModalProps {
  /** App name (used for localStorage key) */
  appName: string
  /** Modal title */
  title: string
  /** Modal description/subtitle */
  description?: string
  /** List of features to highlight */
  features: WelcomeFeature[]
  /** CTA button text */
  ctaText?: string
  /** Callback when modal is closed */
  onClose?: () => void
  /** Force show modal (ignore localStorage) */
  forceShow?: boolean
}

export function WelcomeModal({
  appName,
  title,
  description,
  features,
  ctaText = 'Get Started',
  onClose,
  forceShow = false,
}: WelcomeModalProps) {
  const storageKey = `welcome-modal-seen-${appName.toLowerCase()}`
  const [isOpen, setIsOpen] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    // Check if user has seen the modal before
    if (forceShow) {
      setIsOpen(true)
      return
    }

    const hasSeenModal = localStorage.getItem(storageKey)
    if (!hasSeenModal) {
      // Small delay for better UX (let the page load first)
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [storageKey, forceShow])

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, 'true')
    }
    setIsOpen(false)
    onClose?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-base">{description}</DialogDescription>
          )}
        </DialogHeader>

        <DialogBody>
          <div className="grid gap-4 py-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 rounded-lg border p-4 bg-muted/30">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary text-xl" role="img" aria-label={feature.title}>
                    {/* Icon placeholder - apps can customize with their Icon component */}✨
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold text-base">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={checked => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-sm font-normal cursor-pointer text-muted-foreground"
            >
              Don't show this again
            </Label>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            {ctaText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
