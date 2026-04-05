'use client'

import { forwardRef, useState, useEffect } from 'react'
import { AnimatedIconToggle } from '../animated-icon-toggle'
import { Button } from '../button'
import { Input } from './input'
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

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Show password visibility toggle button */
  showToggle?: boolean
  /** Show password strength indicator */
  showStrength?: boolean
  /** Show requirements checklist */
  showRequirements?: boolean
  /** Password requirements to check */
  requirements?: PasswordRequirement[]
}

const DEFAULT_REQUIREMENTS: PasswordRequirement[] = [
  { test: /.{8,}/, label: 'At least 8 characters' },
  { test: /[a-z]/, label: 'One lowercase letter' },
  { test: /[A-Z]/, label: 'One uppercase letter' },
  { test: /[0-9]/, label: 'One number' },
]

function calculateStrength(password: string, requirements: PasswordRequirement[]): {
  score: number
  label: string
  color: string
} {
  if (!password) return { score: 0, label: 'No password', color: 'bg-gray-300' }

  const passed = requirements.filter((req) => req.test.test(password)).length
  const percentage = (passed / requirements.length) * 100

  if (percentage < 50) {
    return { score: percentage, label: 'Weak', color: 'bg-destructive' }
  } else if (percentage < 75) {
    return { score: percentage, label: 'Fair', color: 'bg-yellow-500' }
  } else if (percentage < 100) {
    return { score: percentage, label: 'Good', color: 'bg-blue-500' }
  } else {
    return { score: percentage, label: 'Strong', color: 'bg-green-500' }
  }
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      showToggle = true,
      showStrength = false,
      showRequirements = false,
      requirements = DEFAULT_REQUIREMENTS,
      value,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [strength, setStrength] = useState(calculateStrength('', requirements))

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
              <span className="sr-only">
                {showPassword ? 'Hide password' : 'Show password'}
              </span>
            </Button>
          )}
        </div>

        {/* Strength indicator */}
        {showStrength && passwordValue && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Password strength:</span>
              <span className={cn('font-medium', {
                'text-destructive': strength.label === 'Weak',
                'text-yellow-600 dark:text-yellow-500': strength.label === 'Fair',
                'text-blue-600 dark:text-blue-500': strength.label === 'Good',
                'text-green-600 dark:text-green-500': strength.label === 'Strong',
              })}>
                {strength.label}
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
                    'text-green-600 dark:text-green-500': passed,
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
