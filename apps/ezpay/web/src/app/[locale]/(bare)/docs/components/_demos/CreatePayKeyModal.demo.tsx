'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="CreatePayKeyModal"
      reason="Single-step modal that creates a new EZPay publishable/secret key pair. Reveals the secret once on success (copy + warning)."
    />
  )
}
