'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Legacy /history route — redirects to homepage for game selection */
export default function LegacyHistoryPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
