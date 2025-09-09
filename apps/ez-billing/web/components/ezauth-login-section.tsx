'use client'
import { useAuth } from '@ezstart/auth-sdk'
import { Button } from '@ezstart/ui/components'

export function EZAuthLoginSection() {
  const { user, isAuthenticated, login } = useAuth()

  if (isAuthenticated && user) {
    return (
      <div className="text-center">
        <p className="text-green-600 mb-2">Welcome back, {user.username}!</p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={login}
        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg"
      >
        Sign In with EZAuth
      </Button>

      <div className="text-center">
        <p className="text-xs text-gray-500">Secure authentication powered by EZAuth</p>
      </div>
    </div>
  )
}
