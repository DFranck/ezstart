'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="DonateButton"
      reason="Drop-in donate CTA that opens Stripe Checkout for a one-time donation. Renders a Button styled with the project's primary token; configurable amount presets, currency, and post-donation redirect."
    />
  )
}
