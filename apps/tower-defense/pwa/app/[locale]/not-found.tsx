'use client'

import { Button, H1, Icon, Main, P, Section } from '@ezstart/ui/components'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Main>
      <Section size="xl" className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6">
          <Icon name="fa:FaExclamationTriangle" className="w-16 h-16 text-yellow-500 mb-4" />
          <H1 className="text-4xl font-bold text-gray-800 mb-2">404 - Page Not Found</H1>
          <P variant="description" className="text-xl mb-6">
            The page you're looking for doesn't exist
          </P>
        </div>

        <div className="space-y-4">
          <P className="text-gray-600 max-w-md">
            You might have mistyped the URL or the page has been moved.
          </P>
          
          <Button asChild variant="default" className="min-w-32">
            <Link href="/">
              <Icon name="fa:FaHome" className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </Section>
    </Main>
  )
}