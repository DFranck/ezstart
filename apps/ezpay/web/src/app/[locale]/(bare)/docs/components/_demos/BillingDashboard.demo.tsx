'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="BillingDashboard"
      reason="User-facing billing hub combining current plan, payment history, and 'Update payment method' CTA. Routes destructive actions through the Stripe Customer Portal."
    />
  )
}
