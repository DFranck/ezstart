'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RegisterForm } from '@/components/RegisterForm'

export default function RegisterPage(): JSX.Element {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">EZAuth</h1>
        <p className="mt-2 text-gray-600">
          Create account to access <span className="font-medium text-primary-600">{app}</span>
        </p>
      </div>

      <RegisterForm 
        app={app} 
        redirect_uri={searchParams.get('redirect_uri')} 
      />

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link 
            href={`/login?${searchParams.toString()}`}
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}