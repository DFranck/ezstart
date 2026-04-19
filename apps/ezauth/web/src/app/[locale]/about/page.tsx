import { Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function AboutPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">About EZAuth</H1>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground">
            EZAuth is a centralized authentication service built by EZStart. It provides secure
            SSO, API key management, OAuth2, 2FA, and role-based access control for all your
            applications.
          </P>
        </CardContent>
      </Card>
    </Main>
  )
}
