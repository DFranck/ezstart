/**
 * Self-contained auth Cards — Clerk-style drop-in components for `/login`,
 * `/register`, `/forgot-password`, `/reset-password`, `/verify-email`.
 *
 * Each Card embeds:
 * - `<AuthCardShell>` chrome (Card container, theme switcher, back button,
 *   brand logo, title/subtitle, footer slot for cross-links)
 * - The matching `<SignInForm>` / `<SignUpForm>` / etc. inside
 * - `useKeyConfig` resolution from the `?key=` URL param so the consumer
 *   brand and white-label theme are auto-applied
 *
 * Consumer apps reduce their auth pages to a single line:
 *
 * @example
 *   // app/[locale]/login/page.tsx
 *   import { SignInCard } from '@ezstart/auth-sdk/components'
 *   export default function LoginPage() {
 *     return <SignInCard />
 *   }
 */

export { SignInCard } from './SignInCard.js'
export type { SignInCardProps, SignInCardTexts } from './SignInCard.js'

export { SignUpCard } from './SignUpCard.js'
export type { SignUpCardProps, SignUpCardTexts } from './SignUpCard.js'

export { ForgotPasswordCard } from './ForgotPasswordCard.js'
export type { ForgotPasswordCardProps, ForgotPasswordCardTexts } from './ForgotPasswordCard.js'

export { ResetPasswordCard } from './ResetPasswordCard.js'
export type { ResetPasswordCardProps, ResetPasswordCardTexts } from './ResetPasswordCard.js'

export { VerifyEmailCard } from './VerifyEmailCard.js'
export type { VerifyEmailCardProps, VerifyEmailCardTexts } from './VerifyEmailCard.js'

// Internal shell (exported for advanced users building custom cards)
export { AuthCardShell } from './auth-card-shell.js'
export type { AuthCardShellProps } from './auth-card-shell.js'
