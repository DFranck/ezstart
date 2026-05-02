'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="PlanEditorDialog"
      reason="Modal form for creating or editing a Plan (name, price, currency, interval, features). Validates against the EZPay schema."
    />
  )
}
