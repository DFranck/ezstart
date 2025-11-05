'use client'

import { OAuthButtons } from '@/components/OAuthButtons'
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  P,
  Span,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Dynamic import for RegisterForm (182 lines)
// Form is only shown after user clicks "Sign up with email"
// Reduces initial bundle size
const RegisterForm = dynamic(() => import('@/components/RegisterForm').then(mod => ({ default: mod.RegisterForm })), {
  loading: () => <div className="animate-pulse bg-muted rounded h-32" />,
})

function RegisterContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'

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
          Create account to access <Span className="text-ezstart font-medium">{app}</Span>
        </CardDescription>
        <P variant={'description'} size={'xs'} className="hidden md:block">
          🌟 <strong>One account, all EZStart apps!</strong>
        </P>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OAuth Buttons (Google, GitHub) */}
        <OAuthButtons app={app} redirect_uri={searchParams.get('redirect_uri')} />

        {/* Classic Email/Password Form */}
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
