import { Button, Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function ContactPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">Contact Us</H1>
        </CardHeader>
        <CardContent className="space-y-4">
          <P className="text-muted-foreground">Have questions or need support? Reach out to us.</P>
          <Button asChild variant="outline">
            <a href="mailto:franckdufournet@hotmail.fr">franckdufournet@hotmail.fr</a>
          </Button>
        </CardContent>
      </Card>
    </Main>
  )
}
