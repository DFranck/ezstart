'use client'

import type { AuditType } from '@ezstart/monitoring'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  LI,
  P,
  Span,
  UL,
} from '@ezstart/ui/components'

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
    // New human-readable fields from audits.json
    audited?: string[]
    notAudited?: string[]
    why?: string
    nextSteps?: string[]
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
        <Div className="flex items-start justify-between">
          <Div className="flex-1">
            <H3 size="h5" className="mb-1">
              {audit.emoji} {audit.name}
            </H3>
            <P className="text-sm text-muted-foreground">{audit.description}</P>
          </Div>
          <Badge className={getStatusColor()}>{audit.status}</Badge>
        </Div>
      </CardHeader>
      <CardContent>
        <Div className="space-y-4">
          {/* Score + Last Updated */}
          <Div className="flex items-center justify-between pb-3 border-b border-border">
            {audit.score !== null ? (
              <>
                <P className="text-sm text-muted-foreground">Score</P>
                <P className={`text-2xl font-bold ${getScoreColor(audit.score)}`}>
                  {audit.score}/100
                </P>
              </>
            ) : (
              <Div className="flex items-center justify-center w-full p-2 bg-muted/50 rounded-md">
                <P className="text-sm text-muted-foreground">Not audited yet</P>
              </Div>
            )}
          </Div>

          {audit.lastUpdated && (
            <Div className="flex items-center justify-between text-sm pb-3 border-b border-border">
              <P className="text-muted-foreground">Last Updated</P>
              <P className="font-medium">{new Date(audit.lastUpdated).toLocaleDateString()}</P>
            </Div>
          )}

          {/* WHY explanation */}
          {audit.why && (
            <Div className="space-y-2">
              <P className="text-sm font-medium text-foreground">📊 Analysis</P>
              <P className="text-sm text-muted-foreground leading-relaxed">{audit.why}</P>
            </Div>
          )}

          {/* Audited items (completed) */}
          {audit.audited && audit.audited.length > 0 && (
            <Div className="space-y-2">
              <P className="text-sm font-medium text-status-healthy">✅ Audited</P>
              <UL className="space-y-1">
                {audit.audited.map((item, idx) => (
                  <LI key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Icon
                      name="lucide:Check"
                      className="w-4 h-4 text-status-healthy mt-0.5 flex-shrink-0"
                    />
                    <Span>{item}</Span>
                  </LI>
                ))}
              </UL>
            </Div>
          )}

          {/* Not Audited items (gaps) */}
          {audit.notAudited && audit.notAudited.length > 0 && (
            <Div className="space-y-2">
              <P className="text-sm font-medium text-status-degraded">⚠️ Not Audited</P>
              <UL className="space-y-1">
                {audit.notAudited.map((item, idx) => (
                  <LI key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Icon
                      name="lucide:X"
                      className="w-4 h-4 text-status-degraded mt-0.5 flex-shrink-0"
                    />
                    <Span>{item}</Span>
                  </LI>
                ))}
              </UL>
            </Div>
          )}

          {/* Next Steps */}
          {audit.nextSteps && audit.nextSteps.length > 0 && (
            <Div className="space-y-2">
              <P className="text-sm font-medium text-primary">🎯 Next Steps</P>
              <UL className="space-y-1">
                {audit.nextSteps.map((step, idx) => (
                  <LI key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Icon
                      name="lucide:ArrowRight"
                      className="w-4 h-4 text-primary mt-0.5 flex-shrink-0"
                    />
                    <Span>{step}</Span>
                  </LI>
                ))}
              </UL>
            </Div>
          )}

          {!audit.exists && (
            <Div className="p-2 bg-status-degraded/10 rounded-md">
              <P className="text-xs text-status-degraded">Audit data not found</P>
            </Div>
          )}
        </Div>
      </CardContent>
    </Card>
  )
}
