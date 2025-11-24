'use client'

import { Div, H1, P } from '@ezstart/ui/components'
import { PromptsManagement } from '../components/PromptsManagement'

export default function PromptsPage() {
  return (
    <Div>
      <Div className="mb-6">
        <H1>System Prompts</H1>
        <P className="text-muted-foreground mt-2">
          Manage AI system prompts used for chat and ESG data extraction
        </P>
      </Div>

      <PromptsManagement />
    </Div>
  )
}
