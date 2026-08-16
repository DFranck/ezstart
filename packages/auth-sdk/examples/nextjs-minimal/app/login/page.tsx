'use client'

import { SignInForm } from '@ezstart/auth-sdk/components'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1rem' }}>
      <SignInForm
        appName="myapp"
        onSuccess={() => router.push('/')}
        texts={{
          submit: 'Continue',
          emailOrUsername: 'Email or username',
          password: 'Password',
        }}
      />
    </main>
  )
}
