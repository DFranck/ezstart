'use client'

import { useEffect, useState } from 'react'
import { callApi } from '@ezstart/ui/utils'

export interface CurrentUser {
  _id: string
  name: string
  email?: string
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        const response = await callApi('/api/auth/me')
        
        if (response.ok) {
          setUser(response.data)
        } else {
          setError('Failed to fetch user')
        }
      } catch (err) {
        console.error('[useCurrentUser] Error:', err)
        setError('Failed to fetch user')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  return { user, loading, error }
}