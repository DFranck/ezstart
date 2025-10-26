import { Suspense } from 'react'
import { H1, P, Card, CardContent, CardHeader } from '@ezstart/ui/components'
import { WorkspacesList } from '@/components/forms/WorkspacesList'
import { CreateWorkspaceDialog } from '@/components/forms/CreateWorkspaceDialog'

export const metadata = {
  title: 'Dashboard - GreenPulse Forms',
  description: 'Manage your workspaces and intelligent forms',
}

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <H1 size="h2" className="mb-2">
            📋 Workspaces
          </H1>
          <P className="text-muted-foreground">
            Your form workspaces - AI-powered intelligent form filling
          </P>
        </div>

        <CreateWorkspaceDialog />
      </div>

      <Suspense fallback={<WorkspacesListSkeleton />}>
        <WorkspacesList />
      </Suspense>
    </div>
  )
}

function WorkspacesListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 w-3/4 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-1/2 bg-muted rounded mb-2 animate-pulse" />
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}