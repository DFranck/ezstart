'use client'

import {
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
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale } from 'next-intl'
import { OAuthButtons, type OAuthProvider } from './OAuthButtons.js'
import { TwoFactorPrompt, type TwoFactorPromptTexts } from './TwoFactorPrompt.js'
import { useAuthNavigation } from '../hooks/useAuthNavigation.js'
import { getAuthTexts, type AuthLocale } from '../i18n/index.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SignInFormTexts {
  emailOrUsername: string
  emailOrUsernamePlaceholder: string
  password: string
  passwordPlaceholder: string
  forgotPassword: string
  submit: string
  submitting: string
  required: string
  minLength: string
  noRedirectUri: string
  fallbackError: string
  // 2FA texts (optional — only needed if 2FA is enabled)
  twoFactorPrompt?: string
  twoFactorCodePlaceholder?: string
  twoFactorVerify?: string
  twoFactorVerifying?: string
  twoFactorBack?: string
  // OAuth texts (optional — only needed if showOAuth is true)
  continueWithGoogle?: string
  orContinueWith?: string
}

export interface SignInFormProps {
  /** App name for the login request */
  appName: string
  /** Redirect URI after login (OAuth code flow) */
  redirectUri?: string
  /** Called after successful login (if not using redirect) */
  onSuccess?: () => void
  /** Called when user clicks "Forgot password" */
  onForgotPassword?: () => void
  /** Href for forgot password link (used if onForgotPassword is not provided) */
  forgotPasswordHref?: string
  /** Show OAuth buttons above the form */
  showOAuth?: boolean
  /** OAuth providers to display */
  oauthProviders?: OAuthProvider[]
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to `useLocale()`.
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<SignInFormTexts>
}

// ─── Component ──────────────────────────────────────────────────────────────

type FormData = {
  email: string
  password: string
}

export function SignInForm({
  appName,
  redirectUri,
  onSuccess,
  onForgotPassword,
  forgotPasswordHref,
  showOAuth = false,
  oauthProviders,
  locale: propLocale,
  texts,
}: SignInFormProps) {
  const contextLocale = useLocale()
  const locale = propLocale ?? contextLocale
  const t: SignInFormTexts = { ...getAuthTexts(locale, 'signIn'), ...texts }
  const navigation = useAuthNavigation()
  const resolvedForgotPasswordHref = forgotPasswordHref ?? navigation.forgotPasswordHref
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [twoFactorState, setTwoFactorState] = useState<{ tempToken: string } | null>(null)

  const form = useForm<FormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (formData: FormData) => {
    if (loading) return

    setLoading(true)
    setError('')

    try {
      const response = await callApi('/auth/login', {
        appName: 'ezauth',
        method: 'POST',
        body: {
          email: formData.email,
          password: formData.password,
          app: appName,
          redirect_uri: redirectUri || undefined,
        },
      })

      if (!response.ok) {
        throw new Error(response.error || parseApiError(response.data) || 'Login failed')
      }

      const result = response.data as {
        code?: string
        requires2FA?: boolean
        tempToken?: string
      }

      // Handle 2FA requirement
      if (result.requires2FA && result.tempToken) {
        setTwoFactorState({ tempToken: result.tempToken })
        setLoading(false)
        return
      }

      // Redirect with authorization code
      if (redirectUri && result.code) {
        logger.info('Redirecting to:', redirectUri)
        const url = new URL(redirectUri)
        url.searchParams.set('code', result.code)
        window.location.href = url.toString()
        return
      }

      // No redirect — call onSuccess callback
      if (onSuccess) {
        onSuccess()
        setLoading(false)
        return
      }

      // No redirect_uri and no onSuccess
      logger.error('No redirect_uri or onSuccess provided!')
      throw new Error(t.noRedirectUri)
    } catch (err) {
      const message = err instanceof Error ? err.message : t.fallbackError
      setError(message)
      setLoading(false)
    }
  }

  // Show 2FA prompt if needed
  if (twoFactorState) {
    const twoFactorTexts: Partial<TwoFactorPromptTexts> = {}
    if (t.twoFactorPrompt) twoFactorTexts.prompt = t.twoFactorPrompt
    if (t.twoFactorCodePlaceholder) twoFactorTexts.codePlaceholder = t.twoFactorCodePlaceholder
    if (t.twoFactorVerify) twoFactorTexts.verify = t.twoFactorVerify
    if (t.twoFactorVerifying) twoFactorTexts.verifying = t.twoFactorVerifying
    if (t.twoFactorBack) twoFactorTexts.back = t.twoFactorBack

    return (
      <TwoFactorPrompt
        tempToken={twoFactorState.tempToken}
        redirectUri={redirectUri}
        onBack={() => setTwoFactorState(null)}
        texts={twoFactorTexts}
      />
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
            rules={{
              required: t.required,
              minLength: { value: 3, message: t.minLength.replace('{min}', '3') },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.emailOrUsername}</FormLabel>
                <FormControl>
                  <Input type="text" placeholder={t.emailOrUsernamePlaceholder} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            rules={{
              required: t.required,
              minLength: { value: 6, message: t.minLength.replace('{min}', '6') },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.password}</FormLabel>
                <FormControl>
                  <PasswordInput placeholder={t.passwordPlaceholder} {...field} />
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
                >
                  {t.forgotPassword}
                </Button>
              ) : (
                <a
                  href={resolvedForgotPasswordHref}
                  className="text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
                >
                  {t.forgotPassword}
                </a>
              )}
            </P>
          </Div>

          <Button
            type="submit"
            disabled={loading || !form.formState.isValid}
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
