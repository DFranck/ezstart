'use client'

import { useAuthStore } from '@ezstart/auth-sdk'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { P } from '@ezstart/ui/components'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to home with return URL
      const returnUrl = encodeURIComponent(pathname || '/dashboard')
      router.push(`/?returnUrl=${returnUrl}`)
    }
  }, [isAuthenticated, router, pathname])

  // Don't render protected content if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <P className="text-muted-foreground">Redirecting to login...</P>
        </div>
      </div>
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}
