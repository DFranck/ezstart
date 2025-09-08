'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    const app = searchParams.get('app')
    const redirect_uri = searchParams.get('redirect_uri')
    
    // Auto-redirect to login with query params
    const loginParams = new URLSearchParams()
    if (app) loginParams.set('app', app)
    if (redirect_uri) loginParams.set('redirect_uri', redirect_uri)
    
    router.replace(`/login?${loginParams.toString()}`)
  }, [router, searchParams])

  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      <p className="mt-2 text-gray-600">Redirecting to login...</p>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}