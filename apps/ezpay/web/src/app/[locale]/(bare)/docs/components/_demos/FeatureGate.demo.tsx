'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="FeatureGate"
      reason="Render-prop guard that shows children only if the user's plan includes the requested feature flag. Falls back to upgrade CTA otherwise."
    />
  )
}
