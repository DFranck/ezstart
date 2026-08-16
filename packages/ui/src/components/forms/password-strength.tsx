'use client'

import { useMemo } from 'react'
import { Div, P } from '../tag'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PasswordStrengthTexts {
  weak: string
  fair: string
  good: string
  strong: string
}

export interface PasswordStrengthProps {
  /** Password value to evaluate. Empty string renders nothing (no-op). */
  password: string
  /** Override default English labels (e.g. for i18n consumers). */
  texts?: Partial<PasswordStrengthTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: PasswordStrengthTexts = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
}

// ─── Logic ──────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Visual password strength indicator.
 *
 * - Computes a 4-tier strength score (weak/fair/good/strong) from password
 *   length + character variety (lower / upper / digit / special).
 * - Renders 4 horizontal bars + a textual label using semantic theme tokens
 *   (`destructive`, `warning`, `success`) for dark/light mode parity.
 * - Pure presentational — zero coupling to any auth lib or i18n library.
 *   Pass localized labels via the `texts` prop.
 *
 * @example basic usage
 * ```tsx
 * import { PasswordStrength } from '@ezstart/ui/components'
 *
 * function SignUpField() {
 *   const [pwd, setPwd] = useState('')
 *   return (
 *     <>
 *       <input value={pwd} onChange={e => setPwd(e.target.value)} type="password" />
 *       <PasswordStrength password={pwd} />
 *     </>
 *   )
 * }
 * ```
 *
 * @example i18n consumer (next-intl)
 * ```tsx
 * const t = useTranslations('signup.password')
 * <PasswordStrength
 *   password={pwd}
 *   texts={{ weak: t('weak'), fair: t('fair'), good: t('good'), strong: t('strong') }}
 * />
 * ```
 */
export function PasswordStrength({ password, texts }: PasswordStrengthProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
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
        {t[label]}
      </P>
    </Div>
  )
}
