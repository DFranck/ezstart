'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="PurchaseButton"
      reason="One-shot purchase CTA — launches Stripe Checkout for a single line item (productId + amount)."
    />
  )
}
