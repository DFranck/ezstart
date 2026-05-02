'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="ConnectOnboardForm"
      reason="Form that kicks off the Stripe Connect Express onboarding flow — collects required country / business type, then redirects to Stripe's hosted onboarding."
    />
  )
}
