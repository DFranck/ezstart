'use client'

import { Button, Div, Icon, Span } from '@ezstart/ui/components'
import { getApiUrl } from '@ezstart/config/urls'

interface OAuthButtonsProps {
  app: string
  redirect_uri?: string | null
}

export function OAuthButtons({ app, redirect_uri }: OAuthButtonsProps) {
  const handleGoogleLogin = () => {
    const apiUrl = getApiUrl('ezauth')
    const params = new URLSearchParams({
      app,
      ...(redirect_uri && { redirect_uri }),
    })

    window.location.href = `${apiUrl}/api/auth/google?${params.toString()}`
  }

  const handleGitHubLogin = () => {
    // TODO: Implement GitHub OAuth
    console.log('GitHub OAuth not yet implemented')
  }

  return (
    <Div className="space-y-3">
      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        <Icon name="lucide:Chrome" className="mr-2" size={20} />
        <Span>Continue with Google</Span>
      </Button>

      {/* GitHub OAuth Button (TODO) */}
      {/* <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGitHubLogin}
        disabled
      >
        <Icon name="lucide:Github" className="mr-2" size={20} />
        <Span>Continue with GitHub</Span>
      </Button> */}

      {/* Divider */}
      <Div className="relative">
        <Div className="absolute inset-0 flex items-center">
          <Span className="w-full border-t" />
        </Div>
        <Div className="relative flex justify-center text-xs uppercase">
          <Span className="bg-background px-2 text-muted-foreground">Or continue with</Span>
        </Div>
      </Div>
    </Div>
  )
}
