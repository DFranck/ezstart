'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="PromoCodeInput"
      reason="Inline text input that validates promo codes against POST /api/promo-codes/validate and surfaces the discount preview."
    />
  )
}
