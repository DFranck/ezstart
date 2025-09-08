'use client'

import { LoginForm } from '@/components/LoginForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ezstart/ui/components'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const redirect_uri = searchParams.get('redirect_uri')

  return (
    <Card className="max-w-md w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">EZAuth</CardTitle>
        <CardDescription>
          Sign in to access <span className="font-medium text-primary">{app}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <LoginForm app={app} redirect_uri={redirect_uri} />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href={`/register?${searchParams.toString()}`}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
