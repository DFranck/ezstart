'use client'

import { Button, H1, Icon, Main, P, Section } from '@ezstart/ui/components'
import Link from 'next/link'

export default function GameNotFound() {
  return (
    <Main>
      <Section size="xl" className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6">
          <Icon name="fa:FaGamepad" className="w-16 h-16 text-gray-400 mb-4" />
          <H1 className="text-4xl font-bold text-gray-800 mb-2">Game Not Found</H1>
          <P variant="description" className="text-xl mb-6">
            This game doesn't exist or has already ended
          </P>
        </div>

        <div className="space-y-4">
          <P className="text-gray-600 max-w-md">
            The game you're looking for might have been deleted, finished, or the link is incorrect.
          </P>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="default" className="min-w-32">
              <Link href="/">
                <Icon name="fa:FaHome" className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="min-w-32">
              <Link href="/">
                <Icon name="fa:FaPlus" className="w-4 h-4 mr-2" />
                Create New Game
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <P>Looking for a specific game? Check the home page for active lobbies.</P>
        </div>
      </Section>
    </Main>
  )
}