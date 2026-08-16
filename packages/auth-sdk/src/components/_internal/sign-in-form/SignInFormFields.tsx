'use client'

import {
  Button,
  Div,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  P,
  PasswordInput,
  Span,
} from '@ezstart/ui/components'
import type { UseFormReturn } from 'react-hook-form'
import type { SignInFormData, SignInFormTexts } from './types.js'

/** @internal */
export interface SignInFormFieldsProps {
  form: UseFormReturn<SignInFormData>
  texts: SignInFormTexts
  disabled: boolean
  forgotPasswordHref: string
  onForgotPassword?: () => void
}

/**
 * The sign-in form field stack (email-or-username + password) plus the
 * "Forgot password?" link. Pure presentation bound to the caller's
 * react-hook-form instance.
 *
 * @internal
 */
export function SignInFormFields({
  form,
  texts,
  disabled,
  forgotPasswordHref,
  onForgotPassword,
}: SignInFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="email"
        rules={{
          required: texts.required,
          minLength: { value: 3, message: texts.minLength.replace('{min}', '3') },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.emailOrUsername}
              <Span aria-hidden="true" className="text-destructive ml-0.5">
                *
              </Span>
            </FormLabel>
            <FormControl>
              <Input
                type="text"
                required
                aria-required="true"
                placeholder={texts.emailOrUsernamePlaceholder}
                autoComplete="username"
                disabled={disabled}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        rules={{
          required: texts.required,
          minLength: { value: 6, message: texts.minLength.replace('{min}', '6') },
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.password}
              <Span aria-hidden="true" className="text-destructive ml-0.5">
                *
              </Span>
            </FormLabel>
            <FormControl>
              <PasswordInput
                required
                aria-required="true"
                placeholder={texts.passwordPlaceholder}
                autoComplete="current-password"
                disabled={disabled}
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

      <Div className="text-right">
        <P size="xs">
          {onForgotPassword ? (
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-xs text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
              onClick={onForgotPassword}
              disabled={disabled}
            >
              {texts.forgotPassword}
            </Button>
          ) : (
            <a
              href={forgotPasswordHref}
              className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {texts.forgotPassword}
            </a>
          )}
        </P>
      </Div>
    </>
  )
}
