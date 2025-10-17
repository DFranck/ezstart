'use client'

import { Card, CardHeader, CardContent, Badge, H3, P } from '@ezstart/ui/components'
import type { AuditType } from '@ezstart/monitoring'

interface AuditCardProps {
  audit: {
    auditType: AuditType
    name: string
    emoji: string
    description: string
    score: number | null
    lastUpdated: string | null
    status: 'complete' | 'partial' | 'not-audited'
    exists: boolean
  }
}

export function AuditCard({ audit }: AuditCardProps) {
  const getStatusColor = () => {
    switch (audit.status) {
      case 'complete':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'partial':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card variant="floating" className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <H3 size="h5" className="mb-1">
              {audit.emoji} {audit.name}
            </H3>
            <P className="text-sm text-muted-foreground">{audit.description}</P>
          </div>
          <Badge className={getStatusColor()}>
            {audit.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {audit.score !== null ? (
            <div className="flex items-center justify-between">
              <P className="text-sm text-muted-foreground">Score</P>
              <P className={`text-2xl font-bold ${getScoreColor(audit.score)}`}>
                {audit.score}/100
              </P>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
              <P className="text-sm text-muted-foreground">Not audited yet</P>
            </div>
          )}

          {audit.lastUpdated && (
            <div className="flex items-center justify-between text-sm">
              <P className="text-muted-foreground">Last Updated</P>
              <P className="font-medium">
                {new Date(audit.lastUpdated).toLocaleDateString()}
              </P>
            </div>
          )}

          {!audit.exists && (
            <div className="mt-3 p-2 bg-yellow-500/10 rounded-md">
              <P className="text-xs text-yellow-600 dark:text-yellow-500">
                Audit file not found
              </P>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
