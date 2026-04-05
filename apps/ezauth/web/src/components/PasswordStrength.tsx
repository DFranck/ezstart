'use client'

import { Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

interface PasswordStrengthProps {
  password: string
}

type Strength = 'weak' | 'fair' | 'good' | 'strong'

function calculateStrength(password: string): { level: number; label: Strength } {
  if (!password) return { level: 0, label: 'weak' }

  let score = 0

  // Length checks
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (password.length >= 14) score++

  // Character variety checks
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return { level: 1, label: 'weak' }
  if (score <= 4) return { level: 2, label: 'fair' }
  if (score <= 5) return { level: 3, label: 'good' }
  return { level: 4, label: 'strong' }
}

const strengthColors: Record<Strength, string> = {
  weak: 'bg-destructive',
  fair: 'bg-warning',
  good: 'bg-warning/70',
  strong: 'bg-success',
}

const strengthTextColors: Record<Strength, string> = {
  weak: 'text-destructive',
  fair: 'text-warning',
  good: 'text-warning/70',
  strong: 'text-success',
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const t = useTranslations('register.passwordStrength')
  const { level, label } = useMemo(() => calculateStrength(password), [password])

  if (!password) return null

  return (
    <Div className="space-y-1">
      <Div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <Div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= level ? strengthColors[label] : 'bg-muted'
            }`}
          />
        ))}
      </Div>
      <P size="xs" className={strengthTextColors[label]}>
        {t(label)}
      </P>
    </Div>
  )
}
