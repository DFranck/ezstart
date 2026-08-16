'use client'

import { Badge, Button, Div, Icon, Input, P } from '@ezstart/ui/components'
import { useState } from 'react'
import { usePayContext } from '../react/pay-provider.js'
import type { PromoValidationResponse } from '../core/types.js'

export interface PromoCodeInputTexts {
  placeholder?: string
  applyButton?: string
  validatingButton?: string
  validLabel?: string
  invalidLabel?: string
  percentOff?: string
  fixedOff?: string
  durationOnce?: string
  durationForever?: string
  durationRepeating?: string
}

export interface PromoValidation {
  valid: boolean
  reason?: string
  discountType?: 'percent' | 'fixed'
  discountValue?: number
  currency?: string
  duration?: 'once' | 'repeating' | 'forever'
}

export interface PromoCodeInputProps {
  appName: string
  value: string
  onChange: (value: string) => void
  onValidated?: (result: PromoValidation | null) => void
  className?: string
  texts?: PromoCodeInputTexts
}

export function PromoCodeInput({
  appName,
  value,
  onChange,
  onValidated,
  className,
  texts,
}: PromoCodeInputProps) {
  const { client } = usePayContext()
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<PromoValidation | null>(null)

  const t = {
    placeholder: texts?.placeholder || 'Promo code',
    applyButton: texts?.applyButton || 'Apply',
    validatingButton: texts?.validatingButton || 'Validating...',
    validLabel: texts?.validLabel || 'Valid',
    invalidLabel: texts?.invalidLabel || 'Invalid code',
    percentOff: texts?.percentOff || 'off',
    fixedOff: texts?.fixedOff || 'off',
    durationOnce: texts?.durationOnce || 'for 1 month',
    durationForever: texts?.durationForever || 'forever',
    durationRepeating: texts?.durationRepeating || 'for {count} months',
  }

  const formatDiscount = (result: PromoValidation): string => {
    if (!result.discountType || result.discountValue === undefined) return ''

    const discountLabel =
      result.discountType === 'percent'
        ? `-${result.discountValue}% ${t.percentOff}`
        : `-${result.discountValue}${result.currency || '€'} ${t.fixedOff}`

    let durationLabel = ''
    if (result.duration === 'once') {
      durationLabel = t.durationOnce
    } else if (result.duration === 'forever') {
      durationLabel = t.durationForever
    } else if (result.duration === 'repeating') {
      durationLabel = t.durationRepeating
    }

    return `${discountLabel} ${durationLabel}`.trim()
  }

  const handleValidate = async () => {
    if (!value.trim()) return

    setIsValidating(true)
    try {
      const response: PromoValidationResponse = await client.validatePromo(value.trim(), appName)
      const result: PromoValidation = response.data
      setValidation(result)
      onValidated?.(result)
    } catch {
      // Validation failure surfaces in the UI via `setValidation(invalid)`.
      // No need to log — the user sees the error immediately.
      const invalid: PromoValidation = { valid: false, reason: 'Validation failed' }
      setValidation(invalid)
      onValidated?.(invalid)
    } finally {
      setIsValidating(false)
    }
  }

  const handleChange = (newValue: string) => {
    onChange(newValue)
    // Reset validation when code changes
    if (validation) {
      setValidation(null)
      onValidated?.(null)
    }
  }

  return (
    <Div className={className}>
      <Div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={e => handleChange(e.target.value)}
          placeholder={t.placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isValidating || !value.trim()}
          onClick={handleValidate}
        >
          {isValidating ? (
            <span className="flex items-center gap-1">
              <Icon name="lucide:Loader2" className="w-3 h-3 animate-spin" />
              {t.validatingButton}
            </span>
          ) : (
            t.applyButton
          )}
        </Button>
      </Div>

      {validation && (
        <Div className="mt-2">
          {validation.valid ? (
            <Div className="flex items-center gap-2">
              <Badge variant="success" dot>
                {t.validLabel}
              </Badge>
              <P size="sm" className="text-success">
                {formatDiscount(validation)}
              </P>
            </Div>
          ) : (
            <Div className="flex items-center gap-2">
              <Badge variant="destructive" dot>
                {t.invalidLabel}
              </Badge>
              {validation.reason && (
                <P size="sm" className="text-destructive">
                  {validation.reason}
                </P>
              )}
            </Div>
          )}
        </Div>
      )}
    </Div>
  )
}
