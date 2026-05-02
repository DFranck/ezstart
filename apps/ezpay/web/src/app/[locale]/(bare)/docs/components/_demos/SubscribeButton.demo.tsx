'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="SubscribeButton"
      reason="Subscribe CTA that launches Stripe Checkout for a recurring plan. Accepts a planId (priceId) and optional trial / coupon overrides."
    />
  )
}
