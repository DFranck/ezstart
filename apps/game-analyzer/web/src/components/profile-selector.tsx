'use client'

import { Button, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import type { PlayerProfile } from '@game-analyzer/types'

const STORAGE_KEY = 'game-analyzer-profile'
const PROFILES: PlayerProfile[] = ['early', 'mid', 'late']

interface ProfileSelectorProps {
  value: PlayerProfile
  onChange: (profile: PlayerProfile) => void
}

export function ProfileSelector({ value, onChange }: ProfileSelectorProps) {
  const t = useTranslations('scan.profile')

  return (
    <Div className="space-y-2">
      <P className="text-sm font-medium">{t('label')}</P>
      <Div className="flex gap-2">
        {PROFILES.map((profile) => (
          <Button
            key={profile}
            variant={value === profile ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(profile)}
          >
            {t(profile)}
          </Button>
        ))}
      </Div>
    </Div>
  )
}

/** Hook to manage profile state with localStorage persistence */
export function usePlayerProfile(): [PlayerProfile, (p: PlayerProfile) => void] {
  const [profile, setProfile] = useState<PlayerProfile>('mid')

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && PROFILES.includes(saved as PlayerProfile)) {
        setProfile(saved as PlayerProfile)
      }
    } catch {}
  }, [])

  const updateProfile = useCallback((p: PlayerProfile) => {
    setProfile(p)
    try {
      localStorage.setItem(STORAGE_KEY, p)
    } catch {}
  }, [])

  return [profile, updateProfile]
}
