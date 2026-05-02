'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="PayNotConfiguredCard"
      reason="Graceful fallback rendered by every pay-sdk component when EZPay is unreachable, the publishable key is invalid, or the Application has no plans configured."
    />
  )
}
