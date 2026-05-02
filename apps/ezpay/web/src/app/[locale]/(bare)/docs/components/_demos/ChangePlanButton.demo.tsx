'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="ChangePlanButton"
      reason="Trigger that opens a dialog letting the user upgrade or downgrade between plans. Calls POST /api/subscriptions/change with proration handled by Stripe."
    />
  )
}
