import { AuthCallbackPage } from '@ezstart/auth-sdk'

export default function CallbackPage(): any {
  return (
    <AuthCallbackPage
      redirectTo="/"
      successMessage="Authentication successful!"
      redirectMessage="Redirecting to home..."
      errorButtonText="Go Back"
    />
  )
}
