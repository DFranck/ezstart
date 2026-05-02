'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="RefundButton"
      reason="Trigger that opens a confirm dialog and then issues a refund via POST /api/payments/:id/refund. Handles partial vs full refund."
    />
  )
}
