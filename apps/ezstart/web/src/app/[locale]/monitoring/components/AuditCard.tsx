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
        return 'bg-status-healthy/10 text-status-healthy border-status-healthy/20'
      case 'partial':
        return 'bg-status-degraded/10 text-status-degraded border-status-degraded/20'
      default:
        return 'bg-status-unknown/10 text-status-unknown border-status-unknown/20'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-status-healthy'
    if (score >= 70) return 'text-status-degraded'
    return 'text-status-unhealthy'
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
            <div className="mt-3 p-2 bg-status-degraded/10 rounded-md">
              <P className="text-xs text-status-degraded">
                Audit file not found
              </P>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
