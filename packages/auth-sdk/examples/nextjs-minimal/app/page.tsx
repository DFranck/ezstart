'use client'

import { LoginButton, UserMenu } from '@ezstart/auth-sdk/components'
import { Card, CardContent, CardHeader, H1, P } from '@ezstart/ui/components'

export default function HomePage() {
  return (
    <main style={{ maxWidth: 720, margin: '4rem auto', padding: '0 1rem' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <H1 size="h2">myapp</H1>
        <UserMenu fallback={<LoginButton>Sign in</LoginButton>} />
      </header>

      <Card variant="floating">
        <CardHeader>
          <H1 size="h3">Welcome</H1>
          <P>Click "Sign in" in the header to start the auth flow.</P>
        </CardHeader>
        <CardContent>
          <P>
            This page is rendered server-side. Because <code>getServerAuth()</code> resolves the
            user before the page is sent to the browser, the header shows the right state on the
            very first frame — no flash from <code>LoginButton</code> to <code>UserMenu</code>.
          </P>
        </CardContent>
      </Card>
    </main>
  )
}
