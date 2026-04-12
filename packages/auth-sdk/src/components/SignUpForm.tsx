'use client'

import {
  Badge,
  Button,
  Div,
  P,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PasswordInput,
} from '@ezstart/ui/components'
import { callApi, parseApiError } from '@ezstart/fetch-client'
import { logger } from '@ezstart/logger'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordStrength } from './PasswordStrength.js'
import { OAuthButtons, type OAuthProvider } from './OAuthButtons.js'
import { usePromoCode } from './usePromoCode.js'
import { useAuthNavigation } from '../hooks/useAuthNavigation.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignUpFormTexts {
  email: string
  emailPlaceholder: string
  emailTaken: string
  username: string
  usernamePlaceholder: string
  usernameTaken: string
  firstName: string
  firstNamePlaceholder: string
  lastName: string
  lastNamePlaceholder: string
  password: string
  passwordPlaceholder: string
  passwordHint: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  passwordMismatch: string
  submit: string
  submitting: string
  fallbackError: string
  // Success state
  checkEmail: string
  checkEmailDescription: string
  backToLogin: string
  // Password strength
  passwordWeak: string
  passwordFair: string
  passwordGood: string
  passwordStrong: string
  // Promo code
  promoCodeLabel: string
  promoCodePlaceholder: string
  promoCodeApplied: string
  promoCodeToggle: string
  promoCodeInvalid: string
  promoCodeRateLimited: string
  promoCodeChecking: string
  // OAuth texts (optional — only needed if showOAuth is true)
  continueWithGoogle?: string
  orContinueWith?: string
}

export interface SignUpFormProps {
  /** App name for the register request */
  appName: string
  /** Pre-filled promo code (auto-detected from URL ?promo= or localStorage if not provided) */
  promoCode?: string
  /** Redirect URI after registration (OAuth code flow) */
  redirectUri?: string
  /** Called after successful registration */
  onSuccess?: () => void
  /** Called when user clicks "Back to login" after registration */
  onBackToLogin?: () => void
  /** Href for back to login link */
  backToLoginHref?: string
  /** Show OAuth buttons above the form */
  showOAuth?: boolean
  /** OAuth providers to display */
  oauthProviders?: OAuthProvider[]
  /** Override texts */
  texts?: Partial<SignUpFormTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: SignUpFormTexts = {
  email: 'Email',
  emailPlaceholder: 'Enter your email',
  emailTaken: 'This email is already taken',
  username: 'Username',
  usernamePlaceholder: 'Choose a username',
  usernameTaken: 'This username is already taken',
  firstName: 'First Name',
  firstNamePlaceholder: 'First name',
  lastName: 'Last Name',
  lastNamePlaceholder: 'Last name',
  password: 'Password',
  passwordPlaceholder: 'Choose a password',
  passwordHint: 'At least 6 characters with a mix of letters, numbers, and symbols.',
  confirmPassword: 'Confirm Password',
  confirmPasswordPlaceholder: 'Confirm your password',
  passwordMismatch: 'Passwords do not match',
  submit: 'Sign Up',
  submitting: 'Creating account...',
  fallbackError: 'An error occurred. Please try again.',
  checkEmail: 'Check your email',
  checkEmailDescription:
    'We sent you a verification email. Please click the link in the email to verify your account.',
  backToLogin: 'Back to login',
  passwordWeak: 'Weak',
  passwordFair: 'Fair',
  passwordGood: 'Good',
  passwordStrong: 'Strong',
  promoCodeLabel: 'Promo code',
  promoCodePlaceholder: 'Enter promo code',
  promoCodeApplied: 'Valid code!',
  promoCodeToggle: 'Have a promo code?',
  promoCodeInvalid: 'Invalid promo code',
  promoCodeRateLimited: 'Please wait a moment and try again',
  promoCodeChecking: 'Checking...',
}

// ─── Component ──────────────────────────────────────────────────────────────

interface FormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  promoCode: string
}

export function SignUpForm({
  appName,
  promoCode,
  redirectUri,
  onSuccess,
  onBackToLogin,
  backToLoginHref,
  showOAuth = false,
  oauthProviders,
  texts,
}: SignUpFormProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }
  const navigation = useAuthNavigation()
  const resolvedBackToLoginHref = backToLoginHref ?? navigation.loginHref
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    promoCode: resolvedPromo,
    setPromoCode: setResolvedPromo,
    isValid: promoIsValid,
    isRateLimited: promoIsRateLimited,
    isValidating: promoIsValidating,
    isOpen: promoOpen,
    setIsOpen: setPromoOpen,
  } = usePromoCode(appName, promoCode)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      promoCode: resolvedPromo,
    },
    mode: 'onChange',
  })

  const watchPassword = form.watch('password')

  // Debounced availability check
  const checkAvailability = useCallback(async (field: 'email' | 'username', value: string) => {
    if (!value || value.length < 3) {
      if (field === 'email') setEmailAvailable(null)
      else setUsernameAvailable(null)
      return
    }

    try {
      const params = new URLSearchParams({ [field]: value })
      const response = await callApi(`/auth/check-availability?${params.toString()}`, {
        appName: 'ezauth',
        method: 'GET',
      })

      if (response.ok) {
        const data = response.data as {
          emailAvailable?: boolean
          usernameAvailable?: boolean
        }
        if (field === 'email') setEmailAvailable(data.emailAvailable ?? null)
        else setUsernameAvailable(data.usernameAvailable ?? null)
      }
    } catch {
      // Silently fail — availability check is non-critical
    }
  }, [])

  const watchEmail = form.watch('email')
  const watchUsername = form.watch('username')

  useEffect(() => {
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    setEmailAvailable(null)
    emailTimerRef.current = setTimeout(() => checkAvailability('email', watchEmail), 500)
    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    }
  }, [watchEmail, checkAvailability])

  useEffect(() => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    setUsernameAvailable(null)
    usernameTimerRef.current = setTimeout(() => checkAvailability('username', watchUsername), 500)
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    }
  }, [watchUsername, checkAvailability])

  const onSubmit = async (formData: FormData) => {
    setLoading(true)
    setError('')

    try {
      const finalPromo = promoIsValid === true ? formData.promoCode?.trim() : undefined
      const response = await callApi('/auth/register', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          app: appName,
          redirect_uri: redirectUri || undefined,
          ...(finalPromo ? { promoCode: finalPromo } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || 'Registration failed')
      }

      setRegistered(true)
      logger.info('Registration successful, verification email sent')
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <Div className="space-y-4 text-center py-4">
        <Div className="text-4xl">&#9993;</Div>
        <P className="font-semibold text-lg">{t.checkEmail}</P>
        <P className="text-sm text-muted-foreground">{t.checkEmailDescription}</P>
        <Div className="pt-2">
          {onBackToLogin ? (
            <Button
              type="button"
              variant="link"
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
              onClick={onBackToLogin}
            >
              {t.backToLogin}
            </Button>
          ) : (
            <a
              href={resolvedBackToLoginHref}
              className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
            >
              {t.backToLogin}
            </a>
          )}
        </Div>
      </Div>
    )
  }

  return (
    <Div className="space-y-3 md:space-y-4">
      {showOAuth && (
        <OAuthButtons
          appName={appName}
          redirectUri={redirectUri}
          providers={oauthProviders}
          texts={{
            ...(t.continueWithGoogle && { continueWithGoogle: t.continueWithGoogle }),
            ...(t.orContinueWith && { orContinueWith: t.orContinueWith }),
          }}
        />
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
          {error && (
            <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md">
              {error}
            </Div>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.email}</FormLabel>
                <FormControl>
                  <Input type="email" required placeholder={t.emailPlaceholder} {...field} />
                </FormControl>
                <FormMessage />
                {emailAvailable === false && (
                  <P size="xs" className="text-destructive">
                    {t.emailTaken}
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
                <FormLabel>{t.username}</FormLabel>
                <FormControl>
                  <Input type="text" required placeholder={t.usernamePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
                {usernameAvailable === false && (
                  <P size="xs" className="text-destructive">
                    {t.usernameTaken}
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
                  <FormLabel className="text-xs md:text-sm">{t.firstName}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t.firstNamePlaceholder} {...field} />
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
                  <FormLabel className="text-xs md:text-sm">{t.lastName}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t.lastNamePlaceholder} {...field} />
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
                <FormLabel>{t.password}</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    minLength={6}
                    placeholder={t.passwordPlaceholder}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <PasswordStrength
                  password={watchPassword}
                  texts={{
                    weak: t.passwordWeak,
                    fair: t.passwordFair,
                    good: t.passwordGood,
                    strong: t.passwordStrong,
                  }}
                />
                <P className="mt-1 text-xs text-muted-foreground">{t.passwordHint}</P>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            rules={{
              validate: (value: string) =>
                value === form.getValues('password') || t.passwordMismatch,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.confirmPassword}</FormLabel>
                <FormControl>
                  <PasswordInput
                    required
                    minLength={6}
                    placeholder={t.confirmPasswordPlaceholder}
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
              {t.promoCodeToggle}
            </Button>
          ) : (
            <FormField
              control={form.control}
              name="promoCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    {t.promoCodeLabel}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder={t.promoCodePlaceholder}
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
                      {t.promoCodeChecking}
                    </P>
                  )}
                  {promoIsValid === true && (
                    <Badge variant="success" className="text-xs">
                      {t.promoCodeApplied}
                    </Badge>
                  )}
                  {promoIsValid === false && !promoIsRateLimited && (
                    <P size="xs" className="text-destructive">
                      {t.promoCodeInvalid}
                    </P>
                  )}
                  {promoIsRateLimited && (
                    <P size="xs" className="text-warning">
                      {t.promoCodeRateLimited}
                    </P>
                  )}
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer"
            variant="default"
          >
            {loading ? t.submitting : t.submit}
          </Button>
        </form>
      </Form>
    </Div>
  )
}
