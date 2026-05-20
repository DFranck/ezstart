'use client'

import {
  Badge,
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
  PasswordStrength,
  Span,
} from '@ezstart/ui/components'
import type { UseFormReturn } from 'react-hook-form'
import { SIGN_UP_MIN_PASSWORD_LENGTH, type SignUpFormData, type SignUpFormTexts } from './types.js'

/** @internal */
export interface SignUpFormFieldsProps {
  form: UseFormReturn<SignUpFormData>
  texts: SignUpFormTexts
  watchPassword: string
  emailAvailable: boolean | null
  usernameAvailable: boolean | null
  promoOpen: boolean
  setPromoOpen: (open: boolean) => void
  setResolvedPromo: (value: string) => void
  promoIsValid: boolean | null
  promoIsRateLimited: boolean
  promoIsValidating: boolean
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
 * The signup form field stack (email, username, names, password,
 * confirm-password, optional promo code). Pure presentation bound to the
 * caller's react-hook-form instance.
 *
 * @internal
 */
export function SignUpFormFields({
  form,
  texts,
  watchPassword,
  emailAvailable,
  usernameAvailable,
  promoOpen,
  setPromoOpen,
  setResolvedPromo,
  promoIsValid,
  promoIsRateLimited,
  promoIsValidating,
}: SignUpFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.email}
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input
                type="email"
                required
                aria-required="true"
                autoComplete="email"
                placeholder={texts.emailPlaceholder}
                {...field}
              />
            </FormControl>
            <FormMessage />
            {emailAvailable === false && (
              <P size="xs" className="text-destructive">
                {texts.emailTaken}
              </P>
            )}
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="username"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.username}
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <Input
                type="text"
                required
                aria-required="true"
                autoComplete="username"
                placeholder={texts.usernamePlaceholder}
                {...field}
              />
            </FormControl>
            <FormMessage />
            {usernameAvailable === false && (
              <P size="xs" className="text-destructive">
                {texts.usernameTaken}
              </P>
            )}
          </FormItem>
        )}
      />

      <Div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs md:text-sm">{texts.firstName}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="given-name"
                  placeholder={texts.firstNamePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs md:text-sm">{texts.lastName}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="family-name"
                  placeholder={texts.lastNamePlaceholder}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Div>

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {texts.password}
              <RequiredMark />
            </FormLabel>
            <FormControl>
              <PasswordInput
                required
                aria-required="true"
                minLength={SIGN_UP_MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                placeholder={texts.passwordPlaceholder}
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
            <P className="mt-1 text-xs text-muted-foreground">{texts.passwordHint}</P>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="confirmPassword"
        rules={{
          validate: (value: string) =>
            value === form.getValues('password') || texts.passwordMismatch,
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
                minLength={SIGN_UP_MIN_PASSWORD_LENGTH}
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

      {!promoOpen ? (
        <Button
          type="button"
          variant="link"
          className="text-xs text-muted-foreground p-0 h-auto cursor-pointer"
          onClick={() => setPromoOpen(true)}
        >
          {texts.promoCodeToggle}
        </Button>
      ) : (
        <FormField
          control={form.control}
          name="promoCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">
                {texts.promoCodeLabel}
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={texts.promoCodePlaceholder}
                  className="h-8 text-sm"
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    setResolvedPromo(e.target.value)
                  }}
                />
              </FormControl>
              {promoIsValidating && (
                <P size="xs" className="text-muted-foreground">
                  {texts.promoCodeChecking}
                </P>
              )}
              {promoIsValid === true && (
                <Badge variant="success" className="text-xs">
                  {texts.promoCodeApplied}
                </Badge>
              )}
              {promoIsValid === false && !promoIsRateLimited && (
                <P size="xs" className="text-destructive">
                  {texts.promoCodeInvalid}
                </P>
              )}
              {promoIsRateLimited && (
                <P size="xs" className="text-warning">
                  {texts.promoCodeRateLimited}
                </P>
              )}
            </FormItem>
          )}
        />
      )}
    </>
  )
}
