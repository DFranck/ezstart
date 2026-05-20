'use client'

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  PasswordInput,
  PasswordStrength,
  Span,
} from '@ezstart/ui/components'
import type { UseFormReturn } from 'react-hook-form'
import {
  RESET_PASSWORD_MIN_LENGTH,
  type ResetPasswordFormData,
  type ResetPasswordFormTexts,
} from './types.js'

/** @internal */
export interface ResetPasswordFieldsProps {
  form: UseFormReturn<ResetPasswordFormData>
  texts: ResetPasswordFormTexts
  watchPassword: string
  minLengthMessage: string
}

/** Required-field marker rendered next to a label. @internal */
function RequiredMark() {
  return (
    <Span aria-hidden="true" className="text-destructive ml-0.5">
      *
    </Span>
  )
}

/**
 * New-password + confirm-password fields with a strength meter. Pure
 * presentation bound to the caller's react-hook-form instance.
 *
 * @internal
 */
export function ResetPasswordFields({
  form,
  texts,
  watchPassword,
  minLengthMessage,
}: ResetPasswordFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="newPassword"
        rules={{
          required: texts.required,
          minLength: { value: RESET_PASSWORD_MIN_LENGTH, message: minLengthMessage },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.newPassword}
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <PasswordInput
                required
                aria-required="true"
                minLength={RESET_PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={texts.newPasswordPlaceholder}
                texts={{
                  showPassword: texts.showPassword,
                  hidePassword: texts.hidePassword,
                }}
                {...field}
              />
            </FormControl>
            <FormMessage />
            <PasswordStrength
              password={watchPassword}
              texts={{
                weak: texts.passwordWeak,
                fair: texts.passwordFair,
                good: texts.passwordGood,
                strong: texts.passwordStrong,
              }}
            />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmPassword"
        rules={{
          required: texts.required,
          minLength: { value: RESET_PASSWORD_MIN_LENGTH, message: minLengthMessage },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.confirmPassword}
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <PasswordInput
                required
                aria-required="true"
                minLength={RESET_PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={texts.confirmPasswordPlaceholder}
                texts={{
                  showPassword: texts.showPassword,
                  hidePassword: texts.hidePassword,
                }}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}
