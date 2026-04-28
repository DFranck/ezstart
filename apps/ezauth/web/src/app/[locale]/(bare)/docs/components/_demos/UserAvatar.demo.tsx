'use client'

import { UserAvatar } from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'

const mockUser = {
  username: 'jdoe',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
}

export default function Demo() {
  return (
    <Div className="flex items-center gap-4">
      <UserAvatar user={mockUser} size="sm" />
      <UserAvatar user={mockUser} size="md" />
      <UserAvatar user={mockUser} size="lg" />
    </Div>
  )
}
