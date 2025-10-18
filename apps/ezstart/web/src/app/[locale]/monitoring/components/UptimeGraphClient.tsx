'use client'

import { UptimeGraph } from '@ezstart/ui/components'
import type { UptimeDataPoint } from '@ezstart/ui/components'

interface UptimeGraphClientProps {
  data: UptimeDataPoint[]
  title?: string
  uptimePercentage?: number
  height?: number
  showPercentage?: boolean
  showTitle?: boolean
}

export function UptimeGraphClient(props: UptimeGraphClientProps) {
  return <UptimeGraph {...props} />
}
