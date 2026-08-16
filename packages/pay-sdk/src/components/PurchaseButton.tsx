'use client'

import { Button, Icon, Modal, P } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import { usePay } from '../react/pay-provider.js'
import { formatCurrency } from '../core/format-currency.js'

export interface PurchaseButtonTexts {
  title?: string
  description?: string
  buyButton?: string
  processingButton?: string
}

export interface PurchaseButtonProps {
  projectId: string
  productId: string
  productName: string
  amount: number
  currency?: string
  description?: string
  userId?: string
  userEmail?: string
  userName?: string
  trigger?: React.ReactNode
  texts?: PurchaseButtonTexts
}

export function PurchaseButton({
  projectId,
  productId,
  productName,
  amount,
  currency = 'EUR',
  description,
  userId,
  userEmail,
  userName,
  trigger,
  texts,
}: PurchaseButtonProps) {
  const { createPurchase, isLoading } = usePay()
  const [open, setOpen] = useState(false)

  // Default texts with fallback
  const t = {
    title: texts?.title || `Purchase ${productName}`,
    // Provided to Modal as the accessible description (DialogDescription) —
    // satisfies the modal's `aria-describedby` accessibility requirement.
    description: texts?.description || description || `Confirm your purchase of ${productName}.`,
    buyButton: texts?.buyButton || 'Buy now',
    processingButton: texts?.processingButton || 'Processing...',
  }

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const result = await createPurchase({
        projectId,
        productId,
        productName,
        amount,
        currency,
        userId,
        customerEmail: userEmail,
        customerName: userName,
      })

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger || (
          <Button variant="default">
            <Icon name="lucide:ShoppingCart" className="w-4 h-4" />
            {productName} — {formatCurrency(amount, currency)}
          </Button>
        )}
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="lucide:ShoppingCart" className="w-5 h-5" />
            {t.title}
          </span>
        }
        description={t.description}
      >
        <form onSubmit={handlePurchase} className="px-2 flex flex-col gap-4">
          {/* Product info */}
          <div className="p-4 rounded-lg bg-muted/50 flex flex-col gap-2">
            <P className="font-semibold">{productName}</P>
            <P size={'lg'} className="font-bold">
              {formatCurrency(amount, currency)}
            </P>
          </div>

          {/* User info */}
          {userName && (
            <P size={'sm'} variant={'description'} className="text-center">
              Purchasing as <span className="font-medium">{userName}</span>
            </P>
          )}

          {/* CTA Button */}
          <Button type="submit" disabled={isLoading} size="lg" className="w-full">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
                {t.processingButton}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="lucide:ShoppingCart" className="w-5 h-5" />
                {t.buyButton} — {formatCurrency(amount, currency)}
              </span>
            )}
          </Button>
        </form>
      </Modal>
    </>
  )
}
