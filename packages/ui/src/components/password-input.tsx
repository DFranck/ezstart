'use client'

import { forwardRef, useState } from 'react'
import { AnimatedIconToggle } from './animated-icon-toggle'
import { Button } from './button'
import { Input } from './input'
import { cn } from '../lib/utils'

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showToggle?: boolean
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    // Remove any type prop from props to avoid conflict
    const { type, ...inputProps } = props as any

    return (
      <div className="relative">
        <Input
          {...inputProps}
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
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export { PasswordInput }