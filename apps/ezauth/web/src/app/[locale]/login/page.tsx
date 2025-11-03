'use client'

import { LoginForm } from '@/components/LoginForm'
import { OAuthButtons } from '@/components/OAuthButtons'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const redirect_uri = searchParams.get('redirect_uri')

  return (
    <Card className="max-w-md w-full relative">
      <div className="absolute top-4 left-4">
        <BackButton />
      </div>
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl md:text-3xl font-bold">EZAuth</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Sign in to access <Span className="text-ezstart font-medium">{app}</Span>
        </CardDescription>
        <P variant={'description'} size={'xs'} className="hidden md:block">
          🌟 <strong>One account, all EZStart apps!</strong>
        </P>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OAuth Buttons (Google, GitHub) */}
        <OAuthButtons app={app} redirect_uri={redirect_uri} />

        {/* Classic Email/Password Form */}
        <LoginForm app={app} redirect_uri={redirect_uri} />

        <div className="text-center">
          <P size={'xs'}>
            Don't have an account?{' '}
            <Link
              href={`/register?${searchParams.toString()}`}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </P>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner variant="primary" size="lg" text="Loading..." />}>
      <LoginContent />
    </Suspense>
  )
}
