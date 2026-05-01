/**
 * Self-contained auth Modals for `/login`, `/register`, `/forgot-password`,
 * `/reset-password`, `/verify-email`. Each Modal is also fully embeddable
 * from any consumer page (e.g. a "Sign in" button that opens the auth flow
 * inline without navigating).
 *
 * Each Modal embeds:
 * - `<AuthModalShell>` chrome (`<Modal>` container, theme switcher, brand
 *   logo, title/subtitle, footer slot for cross-links)
 * - The matching `<SignInForm>` / `<SignUpForm>` / etc. inside
 * - `useKeyConfig` resolution from the `?key=` URL param so the consumer
 *   brand and white-label theme are auto-applied
 *
 * Standalone-route mode (always-open):
 *
 * @example
 *   // app/[locale]/login/page.tsx
 *   'use client'
 *   import { SignInModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function LoginPage() {
 *     const router = useRouter()
 *     return <SignInModal isOpen onClose={() => router.push('/')} />
 *   }
 *
 * Embedded mode (consumer-controlled state):
 *
 * @example
 *   const [open, setOpen] = useState(false)
 *   return (
 *     <>
 *       <Button onClick={() => setOpen(true)}>Sign in</Button>
 *       <SignInModal isOpen={open} onClose={() => setOpen(false)} />
 *     </>
 *   )
 */

export { SignInModal } from './SignInModal.js'
export type { SignInModalProps, SignInModalTexts } from './SignInModal.js'

export { SignUpModal } from './SignUpModal.js'
export type { SignUpModalProps, SignUpModalTexts } from './SignUpModal.js'

export { ForgotPasswordModal } from './ForgotPasswordModal.js'
export type { ForgotPasswordModalProps, ForgotPasswordModalTexts } from './ForgotPasswordModal.js'

export { ResetPasswordModal } from './ResetPasswordModal.js'
export type { ResetPasswordModalProps, ResetPasswordModalTexts } from './ResetPasswordModal.js'

export { VerifyEmailModal } from './VerifyEmailModal.js'
export type { VerifyEmailModalProps, VerifyEmailModalTexts } from './VerifyEmailModal.js'

// Internal shell (exported for advanced users building custom modals)
export { AuthModalShell } from './auth-modal-shell.js'
export type { AuthModalShellProps } from './auth-modal-shell.js'
