'use client'

import { Button, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import type { PlayerProfile } from '@gacha-analyzer/types'

const STORAGE_KEY_PREFIX = 'gacha-analyzer-profile'
const PROFILES: PlayerProfile[] = ['early', 'mid', 'late']

function storageKey(gameType: string): string {
  return `${STORAGE_KEY_PREFIX}-${gameType}`
}

interface ProfileSelectorProps {
  value: PlayerProfile
  onChange: (profile: PlayerProfile) => void
  gameType: string
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

/** Hook to manage profile state with localStorage persistence per game */
export function usePlayerProfile(gameType: string | null): [PlayerProfile, (p: PlayerProfile) => void] {
  const [profile, setProfile] = useState<PlayerProfile>('mid')

  useEffect(() => {
    if (typeof window === 'undefined' || !gameType) return
    try {
      const saved = localStorage.getItem(storageKey(gameType))
      if (saved && PROFILES.includes(saved as PlayerProfile)) {
        setProfile(saved as PlayerProfile)
      } else {
        setProfile('mid')
      }
    } catch {}
  }, [gameType])

  const updateProfile = useCallback((p: PlayerProfile) => {
    setProfile(p)
    if (!gameType) return
    try {
      localStorage.setItem(storageKey(gameType), p)
    } catch {}
  }, [gameType])

  return [profile, updateProfile]
}
