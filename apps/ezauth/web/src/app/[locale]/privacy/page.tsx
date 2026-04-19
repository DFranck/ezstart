import { Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function PrivacyPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">Privacy Policy</H1>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground">
            This privacy policy will be updated before launch.
          </P>
        </CardContent>
      </Card>
    </Main>
  )
}
