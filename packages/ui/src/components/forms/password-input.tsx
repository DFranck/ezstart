'use client'

import { forwardRef, useState, useEffect } from 'react'
import { AnimatedIconToggle } from '../animated-icon-toggle'
import { Button } from '../button'
import { Input } from './input'
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'
import { cn } from '../../lib/utils'
import { CheckIcon, XIcon } from 'lucide-react'

/**
 * PasswordInput Component - Enhanced with Strength Indicator
 *
 * Accessible password input with show/hide toggle and optional strength indicator.
 *
 * @example
 * // Basic usage
 * <PasswordInput placeholder="Enter password" />
 *
 * @example
 * // With strength indicator
 * <PasswordInput
 *   showStrength
 *   value={password}
 *   onChange={(e) => setPassword(e.target.value)}
 * />
 *
 * @example
 * // With requirements checklist
 * <PasswordInput
 *   showStrength
 *   showRequirements
 *   requirements={[
 *     { test: /.{8,}/, label: 'At least 8 characters' },
 *     { test: /[A-Z]/, label: 'One uppercase letter' },
 *     { test: /[0-9]/, label: 'One number' }
 *   ]}
 * />
 */

export interface PasswordRequirement {
  test: RegExp
  label: string
}

export interface PasswordInputTexts {
  /** sr-only text when password is hidden (eye icon shown) */
  showPassword?: string
  /** sr-only text when password is visible (eye-off icon shown) */
  hidePassword?: string
  /** Label preceding the strength badge */
  strengthLabel?: string
  /** Strength badges in increasing order */
  strengthWeak?: string
  strengthFair?: string
  strengthGood?: string
  strengthStrong?: string
  strengthEmpty?: string
}

export interface PasswordInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  /** Size token — passed to inner Input and toggle Button. Inherits from DesignTokenProvider if not set. */
  size?: string
  /** Show password visibility toggle button */
  showToggle?: boolean
  /** Show password strength indicator */
  showStrength?: boolean
  /** Show requirements checklist */
  showRequirements?: boolean
  /** Password requirements to check */
  requirements?: PasswordRequirement[]
  /** Translatable strings — defaults to English. Pass to localize. */
  texts?: PasswordInputTexts
}

const DEFAULT_TEXTS: Required<PasswordInputTexts> = {
  showPassword: 'Show password',
  hidePassword: 'Hide password',
  strengthLabel: 'Password strength:',
  strengthWeak: 'Weak',
  strengthFair: 'Fair',
  strengthGood: 'Good',
  strengthStrong: 'Strong',
  strengthEmpty: 'No password',
}

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = [
  { test: /.{8,}/, label: 'At least 8 characters' },
  { test: /[a-z]/, label: 'One lowercase letter' },
  { test: /[A-Z]/, label: 'One uppercase letter' },
  { test: /[0-9]/, label: 'One number' },
]

type StrengthBucket = 'empty' | 'weak' | 'fair' | 'good' | 'strong'

function calculateStrength(
  password: string,
  requirements: PasswordRequirement[]
): {
  score: number
  bucket: StrengthBucket
  color: string
} {
  if (!password) return { score: 0, bucket: 'empty', color: 'bg-muted' }

  const passed = requirements.filter(req => req.test.test(password)).length
  const percentage = (passed / requirements.length) * 100

  if (percentage < 50) {
    return { score: percentage, bucket: 'weak', color: 'bg-destructive' }
  } else if (percentage < 75) {
    return { score: percentage, bucket: 'fair', color: 'bg-warning' }
  } else if (percentage < 100) {
    return { score: percentage, bucket: 'good', color: 'bg-info' }
  } else {
    return { score: percentage, bucket: 'strong', color: 'bg-success' }
  }
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      size: sizeProp,
      showToggle = true,
      showStrength = false,
      showRequirements = false,
      requirements = DEFAULT_REQUIREMENTS,
      texts,
      value,
      ...props
    },
    ref
  ) => {
    const inherited = useDesignTokens()
    const size = (sizeProp ?? inherited.size) as React.ComponentProps<typeof Input>['size']
    const [showPassword, setShowPassword] = useState(false)
    const [strength, setStrength] = useState(calculateStrength('', requirements))
    const t = { ...DEFAULT_TEXTS, ...texts }
    const strengthLabels: Record<StrengthBucket, string> = {
      empty: t.strengthEmpty,
      weak: t.strengthWeak,
      fair: t.strengthFair,
      good: t.strengthGood,
      strong: t.strengthStrong,
    }

    const passwordValue = (value as string) || ''

    useEffect(() => {
      if (showStrength || showRequirements) {
        setStrength(calculateStrength(passwordValue, requirements))
      }
    }, [passwordValue, requirements, showStrength, showRequirements])

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    return (
      <div className="space-y-2">
        {/* Input with toggle */}
        <div className="relative">
          <Input
            {...props}
            value={value}
            type={showPassword ? 'text' : 'password'}
            size={size}
            className={cn('pr-10', className)}
            ref={ref}
          />
          {showToggle && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={togglePasswordVisibility}
              tabIndex={-1}
            >
              <AnimatedIconToggle
                icon1="lucide:Eye"
                icon2="lucide:EyeOff"
                isToggled={showPassword}
              />
              <span className="sr-only">{showPassword ? t.hidePassword : t.showPassword}</span>
            </Button>
          )}
        </div>

        {/* Strength indicator */}
        {showStrength && passwordValue && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t.strengthLabel}</span>
              <span
                className={cn('font-medium', {
                  'text-destructive': strength.bucket === 'weak',
                  'text-warning': strength.bucket === 'fair',
                  'text-info': strength.bucket === 'good',
                  'text-success': strength.bucket === 'strong',
                })}
              >
                {strengthLabels[strength.bucket]}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full transition-all duration-300', strength.color)}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        )}

        {/* Requirements checklist */}
        {showRequirements && passwordValue && (
          <ul className="space-y-1.5 text-xs">
            {requirements.map((req, index) => {
              const passed = req.test.test(passwordValue)
              return (
                <li
                  key={index}
                  className={cn('flex items-center gap-2', {
                    'text-success': passed,
                    'text-muted-foreground': !passed,
                  })}
                >
                  {passed ? (
                    <CheckIcon className="size-3.5 shrink-0" />
                  ) : (
                    <XIcon className="size-3.5 shrink-0" />
                  )}
                  <span>{req.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }
