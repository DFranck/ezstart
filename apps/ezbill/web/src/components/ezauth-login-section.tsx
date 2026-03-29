'use client'
import { useAuth } from '@ezstart/auth-sdk'
import { Button, Card, CardContent, CardHeader, H3, Div, P } from '@ezstart/ui/components'
import Link from 'next/link'

export function EZAuthLoginSection() {
  const { user, isAuthenticated, login } = useAuth()

  if (isAuthenticated && user) {
    return (
      <Card variant={'ghost'}>
        <CardHeader>
          <H3 size={'h6'}>Welcome back, {user.username}!</H3>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href={'/dashboard'}>Dashboard</Link>
          </Button>
        </CardContent>
        {/* <P className="text-sm text-muted-foreground">Redirecting to dashboard...</P> */}
      </Card>
    )
  }

  return (
    <Div className="space-y-4">
      <Button
        onClick={() => login()}
        className="w-full bg-gradient-company hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
      >
        Sign In with EZAuth
      </Button>

      <Div className="text-center">
        <P className="text-xs text-muted-foreground">Secure authentication powered by EZAuth</P>
      </Div>
    </Div>
  )
}
