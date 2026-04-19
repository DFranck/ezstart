import { Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function BlogPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">Blog</H1>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground">Coming soon.</P>
        </CardContent>
      </Card>
    </Main>
  )
}
