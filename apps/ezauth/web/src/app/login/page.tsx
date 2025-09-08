'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/components/LoginForm'

function LoginContent() {
  const searchParams = useSearchParams()
  const app = searchParams.get('app') || 'ezstart'
  const redirect_uri = searchParams.get('redirect_uri')

  return (
    <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">EZAuth</h1>
        <p className="mt-2 text-gray-600">
          Sign in to access <span className="font-medium text-primary-600">{app}</span>
        </p>
      </div>

      <LoginForm app={app} redirect_uri={redirect_uri} />

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link 
            href={`/register?${searchParams.toString()}`}
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}