'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Legacy /scan/[id] route — redirects to homepage for game selection */
export default function LegacyScanDetailPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
