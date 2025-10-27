import { AuthCallbackPage } from '@ezstart/auth-sdk'

export default function CallbackPage() {
  return (
    <AuthCallbackPage
      redirectTo="/"
      successMessage="Authentication successful!"
      redirectMessage="Redirecting to home..."
      errorButtonText="Back to Home"
      errorButtonClassName="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    />
  )
}
