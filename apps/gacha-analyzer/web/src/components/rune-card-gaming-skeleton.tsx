import { Div, Skeleton } from '@ezstart/ui/components'

export function RuneCardGamingSkeleton() {
  return (
    <Div className="relative rounded-xl border-2 border-border overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background pattern */}
      <Div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_0%,_rgba(255,255,255,0.2),_transparent_70%)]" />

      {/* Content */}
      <Div className="relative p-4 space-y-3">
        {/* Header: Set name + Stars */}
        <Div className="text-center space-y-1">
          <Skeleton className="h-8 w-8 mx-auto rounded" />
          <Skeleton className="h-5 w-24 mx-auto" />
          <Div className="flex items-center justify-center gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-3 rounded-full" />
            ))}
          </Div>
          <Div className="flex items-center justify-center gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-10 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </Div>
        </Div>

        {/* Advice block */}
        <Div className="rounded-lg p-3 bg-muted/20">
          <Skeleton className="h-8 w-32 mx-auto" />
          <Skeleton className="h-3 w-20 mx-auto mt-1" />
          <Skeleton className="h-3 w-40 mx-auto mt-1" />
        </Div>

        {/* Main stat */}
        <Div className="text-center py-2 bg-muted/20 rounded-lg">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Skeleton className="h-6 w-36 mx-auto mt-1" />
          <Skeleton className="h-3 w-28 mx-auto mt-1" />
        </Div>

        {/* Decorative separator */}
        <Div className="flex items-center gap-2">
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        </Div>

        {/* Substats with HP bars */}
        <Div className="space-y-2">
          <Skeleton className="h-3 w-16 mx-auto" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Div key={i} className="space-y-0.5">
              <Div className="flex items-center justify-between">
                <Div className="flex items-center gap-1.5">
                  <Skeleton className="h-3 w-3 rounded" />
                  <Skeleton className="h-3 w-10" />
                </Div>
                <Div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-3 w-6" />
                </Div>
              </Div>
              <Skeleton className="h-2 w-full rounded-full" />
            </Div>
          ))}
        </Div>

        {/* Decorative separator */}
        <Div className="flex items-center gap-2">
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        </Div>

        {/* Efficiency display */}
        <Div className="text-center space-y-1">
          <Skeleton className="h-3 w-24 mx-auto" />
          <Skeleton className="h-10 w-20 mx-auto" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </Div>

        {/* Efficiency grid */}
        <Div className="grid grid-cols-2 gap-2">
          <Div className="bg-muted/20 rounded-lg p-2 text-center">
            <Skeleton className="h-2 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto mt-1" />
          </Div>
          <Div className="bg-muted/20 rounded-lg p-2 text-center">
            <Skeleton className="h-2 w-16 mx-auto" />
            <Skeleton className="h-4 w-14 mx-auto mt-1" />
          </Div>
        </Div>

        {/* Synergy badges */}
        <Div className="space-y-2">
          <Skeleton className="h-3 w-16 mx-auto" />
          <Div className="flex flex-wrap gap-2 justify-center">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </Div>
        </Div>

        {/* Set bonus */}
        <Skeleton className="h-3 w-28 mx-auto" />
      </Div>
    </Div>
  )
}
