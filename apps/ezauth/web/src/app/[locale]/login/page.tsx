'use client'

import { getAppTheme } from '@/config/app-themes'
import { OAuthButtons } from '@/components/OAuthButtons'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Dynamic import for LoginForm (144 lines)
// Form is only shown after user clicks "Sign in with email"
// Reduces initial bundle size
const LoginForm = dynamic(
  () => import('@/components/LoginForm').then(mod => ({ default: mod.LoginForm })),
  {
    loading: () => <Div className="animate-pulse bg-muted rounded h-32" />,
  }
)

function LoginContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const redirect_uri = searchParams.get('redirect_uri')
  const theme = getAppTheme(app)

  return (
    <Card className="max-w-md w-full relative">
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">EZAuth</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Sign in to access{' '}
          <Span className={`${theme.primaryColor} font-semibold`}>{theme.name}</Span>
        </CardDescription>
        {theme.showEzstartMessage && (
          <P variant={'description'} size={'xs'} className="hidden md:block">
            One account, all EZStart apps!
          </P>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OAuth Buttons (Google, GitHub) */}
        <OAuthButtons app={app} redirect_uri={redirect_uri} />

        {/* Classic Email/Password Form */}
        <LoginForm app={app} redirect_uri={redirect_uri} />

        <Div className="text-center">
          <P size={'xs'}>
            Don't have an account?{' '}
            <Link
              href={`/register?${searchParams.toString()}`}
              className={`${theme.primaryColor} hover:opacity-80 font-medium`}
            >
              Sign up
            </Link>
          </P>
        </Div>
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
