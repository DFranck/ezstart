import { AuthCallbackPage } from '@ezstart/auth-sdk'

export default function CallbackPage() {
  return (
    <AuthCallbackPage
      redirectTo="/dashboard"
      successMessage="Authentication successful!"
      redirectMessage="Redirecting to dashboard..."
      errorButtonText="Back to Home"
    />
  )
}
