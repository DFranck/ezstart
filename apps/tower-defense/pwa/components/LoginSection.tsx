'use client'

import { usePlayerStore } from '@/stores/usePlayerStore'
import { Button, Icon, Input, Section, Span } from '@ezstart/ui/components'
import { useState } from 'react'

export function LoginSection() {
  const { player, register, reset } = usePlayerStore()
  const [name, setName] = useState('')

  const handleLogin = async () => {
    if (!name) return
    try {
      await register(name)
    } catch (err) {
      console.error('Failed to register player', err)
    }
  }
  return (
    <Section className="flex flex-col gap-4">
      {!player ? (
        <form
          onSubmit={e => {
            e.preventDefault()
            handleLogin()
          }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <Input
            placeholder="Player name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-fit"
          />
          <Button type="submit" disabled={!name}>
            Continue
          </Button>
        </form>
      ) : (
        <>
          <Span className="text-lg font-semibold flex items-center gap-2">
            <Icon name="fa:FaUserCheck" className="text-green-500" />
            Connected as {player.name}
          </Span>
          <Button variant={'outline'} onClick={reset}>
            Logout
          </Button>
        </>
      )}
    </Section>
  )
}
