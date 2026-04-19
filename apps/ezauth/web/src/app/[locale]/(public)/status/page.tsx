import { Badge, Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function StatusPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">Status</H1>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="success" size="lg">
            All systems operational
          </Badge>
          <P className="text-muted-foreground">Service status monitoring coming soon.</P>
        </CardContent>
      </Card>
    </Main>
  )
}
