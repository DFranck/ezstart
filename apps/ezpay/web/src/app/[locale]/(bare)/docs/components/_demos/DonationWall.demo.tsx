'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="DonationWall"
      reason="Public donor wall that lists recent donations (name, amount, optional message) for a project. Powered by GET /api/donations with pagination + privacy-aware fields."
    />
  )
}
