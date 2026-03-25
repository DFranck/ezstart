import { Card, CardContent, CardHeader, Div, Skeleton } from '@ezstart/ui/components'

export function RuneCardDetailedSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-2 px-3 pt-3">
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </Div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </Div>
        <Div className="flex items-center gap-2 mt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </Div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 pb-3">
        {/* Progressive Advice */}
        <Div className="p-3 rounded-lg border-2 border-border">
          <Div className="flex items-center justify-between mb-1">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </Div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32 mt-1" />
        </Div>

        {/* Main stat */}
        <Div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </Div>
        </Div>

        {/* Innate stat */}
        <Div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-14" />
          </Div>
        </Div>

        {/* Separator */}
        <Div className="border-t border-border" />

        {/* Substats with progress bars */}
        <Div>
          <Skeleton className="h-3 w-16 mb-2" />
          <Div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Div key={i} className="space-y-1">
                <Div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-3 w-20" />
                  </Div>
                </Div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </Div>
            ))}
          </Div>
        </Div>

        {/* Separator */}
        <Div className="border-t border-border" />

        {/* Roll Quality */}
        <Div className="space-y-2">
          <Div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-4 w-12" />
            </Div>
          </Div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <Div className="grid grid-cols-2 gap-2">
            <Div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
            </Div>
            <Div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </Div>
          </Div>
        </Div>

        {/* Separator */}
        <Div className="border-t border-border" />

        {/* Synergy */}
        <Div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Div className="flex flex-wrap gap-2">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </Div>
        </Div>

        {/* Set bonus */}
        <Div className="border-t border-border" />
        <Div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </Div>
      </CardContent>
    </Card>
  )
}
