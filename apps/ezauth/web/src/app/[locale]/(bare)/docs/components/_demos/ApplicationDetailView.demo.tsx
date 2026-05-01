'use client'

import { Placeholder } from './Placeholder'

export default function Demo() {
  return (
    <Placeholder
      name="ApplicationDetailView"
      reason="Detail view for a single Application — keys, theme, settings. Requires a real `applicationId` to fetch and is rendered inside the parent ApplicationsList. Open the parent component's preview to see this view live in context."
      cta={{
        label: 'See ApplicationsList preview',
        href: '/docs/components/applicationsKeys/applicationslist',
      }}
    />
  )
}
