import { AuthCallbackPage } from '@ezstart/auth-sdk'

export default function CallbackPage(): any {
  return (
    <AuthCallbackPage
      redirectTo="/"
      successMessage="Authentication successful!"
      redirectMessage="Redirecting to home..."
      errorButtonText="Back to Home"
      errorButtonClassName="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
    />
  )
}
