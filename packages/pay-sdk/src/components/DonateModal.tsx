'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@ezstart/ui/components'
import { Button } from '@ezstart/ui/components'
import { Input } from '@ezstart/ui/components'
import { TextArea } from '@ezstart/ui/components'
import { Label } from '@ezstart/ui/components'
import { usePay } from '../provider.js'
import { DonateButton } from './DonateButton.js'

interface DonateModalProps {
  projectId: string
  projectName?: string
  amounts?: number[]
  userId?: string
  userEmail?: string
  userName?: string
  trigger?: React.ReactNode
}

export function DonateModal({
  projectId,
  projectName,
  amounts = [5, 10, 25, 50],
  userId,
  userEmail,
  userName,
  trigger,
}: DonateModalProps) {
  const { createDonation, isLoading } = usePay()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(amounts[1] || 10)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const handleDonate = async () => {
    try {
      const finalAmount = customAmount ? parseFloat(customAmount) : amount

      const result = await createDonation({
        projectId,
        amount: finalAmount,
        message: message || undefined,
        isPublic: true,
        isAnonymous,
        userId,
        donorEmail: userEmail,
        donorName: isAnonymous ? 'Anonymous' : userName,
      })

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      console.error('Donation failed:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <DonateButton>❤️ Donate</DonateButton>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Support {projectName || projectId}</DialogTitle>
          <DialogDescription>
            Your support helps us keep this project running and improving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset amounts */}
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="grid grid-cols-4 gap-2">
              {amounts.map(val => (
                <Button
                  key={val}
                  type="button"
                  variant={amount === val && !customAmount ? 'default' : 'outline'}
                  onClick={() => {
                    setAmount(val)
                    setCustomAmount('')
                  }}
                >
                  ${val}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Custom amount ($)</Label>
            <Input
              id="custom-amount"
              type="number"
              min="1"
              step="0.01"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              placeholder="Enter custom amount"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <TextArea
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder="Leave a message..."
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Anonymous toggle */}
          {userId && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setIsAnonymous(e.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Donate anonymously
              </Label>
            </div>
          )}

          {/* User info */}
          {userId && !isAnonymous && (
            <p className="text-sm text-muted-foreground">Donating as {userName || userEmail}</p>
          )}

          {/* Donate button */}
          <Button onClick={handleDonate} disabled={isLoading} className="w-full">
            {isLoading ? 'Processing...' : `Donate $${customAmount || amount}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
