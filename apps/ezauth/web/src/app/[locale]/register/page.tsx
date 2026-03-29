'use client'

import { getAppTheme } from '@/config/app-themes'
import { OAuthButtons } from '@/components/OAuthButtons'
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
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Dynamic import for RegisterForm (182 lines)
// Form is only shown after user clicks "Sign up with email"
// Reduces initial bundle size
const RegisterForm = dynamic(
  () => import('@/components/RegisterForm').then(mod => ({ default: mod.RegisterForm })),
  {
    loading: () => <Div className="animate-pulse bg-muted rounded h-32" />,
  }
)

function RegisterContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
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
        <CardTitle className="text-2xl md:text-3xl font-bold">EZAuth</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Create account to access{' '}
          <Span className={`${theme.primaryColor} font-medium`}>{theme.name}</Span>
        </CardDescription>
        {theme.showEzstartMessage && (
          <P variant={'description'} size={'xs'} className="hidden md:block">
            One account, all EZStart apps!
          </P>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* OAuth Buttons (Google, GitHub) */}
        <OAuthButtons app={app} redirect_uri={searchParams.get('redirect_uri')} />

        {/* Classic Email/Password Form */}
        <RegisterForm app={app} redirect_uri={searchParams.get('redirect_uri')} />

        <Div className="text-center">
          <P size={'xs'}>
            Already have an account?{' '}
            <Link
              href={`/login?${searchParams.toString()}`}
              className={`${theme.primaryColor} hover:opacity-80 font-medium`}
            >
              Sign in
            </Link>
          </P>
        </Div>
      </CardContent>
    </Card>
  )
}

export default function RegisterPage(): any {
  return (
    <Suspense fallback={<Div>Loading...</Div>}>
      <RegisterContent />
    </Suspense>
  )
}
