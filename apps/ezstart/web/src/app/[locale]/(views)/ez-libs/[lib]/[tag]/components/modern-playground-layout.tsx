'use client'

import { Badge, Card, CardContent, CardHeader, CardTitle, Div, H3 } from '@ezstart/ui/components'
import { ReactNode } from 'react'

type ModernPlaygroundLayoutProps = {
  title: string
  preview: ReactNode
  controls: ReactNode
  codeView: ReactNode
  activeVariants?: Record<string, string>
}

export function ModernPlaygroundLayout({
  title,
  preview,
  controls,
  codeView,
  activeVariants,
}: ModernPlaygroundLayoutProps) {
  return (
    <Div className="space-y-6 py-8">
      {/* Header */}
      <Div className="space-y-3">
        <H3 className="text-center">{title}</H3>
        {activeVariants && Object.keys(activeVariants).length > 0 && (
          <Div className="flex flex-wrap items-center justify-center gap-2">
            {Object.entries(activeVariants).map(([key, value]) => (
              <Badge key={key} variant="secondary" size="sm">
                {key}: {value}
              </Badge>
            ))}
          </Div>
        )}
      </Div>

      {/* Main Layout: Preview + Controls */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Section */}
        <Div className="space-y-4 order-2 lg:order-1">
          <Card variant="outline" className="relative overflow-hidden min-h-[400px]">
            <Div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <CardContent className="relative z-10 flex items-center justify-center min-h-[400px] p-8">
              {preview}
            </CardContent>
          </Card>
        </Div>

        {/* Controls Section */}
        <Div className="space-y-4 order-1 lg:order-2">
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Customize
              </CardTitle>
            </CardHeader>
            <CardContent>{controls}</CardContent>
          </Card>
        </Div>
      </Div>

      {/* Code Section */}
      <Card variant="floating">
        <CardContent className="p-6">{codeView}</CardContent>
      </Card>
    </Div>
  )
}
