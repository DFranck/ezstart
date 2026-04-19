import { Button, Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function DocsPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">Documentation</H1>
        </CardHeader>
        <CardContent className="space-y-4">
          <P className="text-muted-foreground">
            Coming soon. In the meantime, check out the SDK README on GitHub.
          </P>
          <Button asChild variant="outline">
            <a
              href="https://github.com/DFranck/ezstart/tree/master/packages/auth-sdk"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </CardContent>
      </Card>
    </Main>
  )
}
