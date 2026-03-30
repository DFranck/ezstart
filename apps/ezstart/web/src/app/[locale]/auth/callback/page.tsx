import { AuthCallbackPage } from '@ezstart/auth-sdk'

export default function CallbackPage() {
  return (
    <AuthCallbackPage
      redirectTo="/"
      successMessage="Authentication successful!"
      redirectMessage="Redirecting to home..."
      errorButtonText="Back to Home"
      errorButtonClassName="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
    />
  )
}
