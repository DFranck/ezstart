'use client'

import { RegisterForm } from '@/components/RegisterForm'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  P,
  Span,
  ThemeSwitcher,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'

  return (
    <Card className="max-w-md w-full relative">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">EZAuth</CardTitle>
        <CardDescription>
          Create account to access <Span className="text-ezstart font-medium">{app}</Span>
        </CardDescription>
        <P variant={'description'} size={'xs'}>
          🌟 <strong>One account, all EZStart apps!</strong>
        </P>
      </CardHeader>

      <CardContent className="space-y-6">
        <RegisterForm app={app} redirect_uri={searchParams.get('redirect_uri')} />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href={`/login?${searchParams.toString()}`}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  )
}
