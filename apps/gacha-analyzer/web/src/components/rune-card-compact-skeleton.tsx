import { Card, CardContent, Div, Skeleton } from '@ezstart/ui/components'

export function RuneCardCompactSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Row 1: Set, Slot, Level, Quality | Roll Quality + Advice */}
        <Div className="flex items-center justify-between">
          <Div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-10 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </Div>
          <Div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </Div>
        </Div>

        {/* Row 2: Main stat */}
        <Div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </Div>

        {/* Separator */}
        <Div className="border-t border-border" />

        {/* Row 3: Substats grid */}
        <Div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-10" />
              <Div className="flex items-center gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-2 w-4" />
              </Div>
            </Div>
          ))}
        </Div>

        {/* Row 4: Potential + Grind */}
        <Div className="flex items-center gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-32" />
        </Div>

        {/* Row 5: Synergy badges */}
        <Div className="flex flex-wrap gap-1">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </Div>
      </CardContent>
    </Card>
  )
}
