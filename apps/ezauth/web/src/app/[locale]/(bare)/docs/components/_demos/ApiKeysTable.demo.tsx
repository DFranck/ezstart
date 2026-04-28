'use client'

import { ApiKeysTable } from '@ezstart/auth-sdk/components'
import type { ApiKeyItem } from '@ezstart/auth-sdk'
import { Div } from '@ezstart/ui/components'

const mockKeys: ApiKeyItem[] = [
  {
    id: 'demo-1',
    keyPrefix: 'ez_pk_live_a1b2c3',
    name: 'Production',
    appName: 'ezauth',
    scope: 'live',
    permissions: ['*'],
    status: 'active',
    createdAt: '2026-03-12T10:30:00.000Z',
    lastUsedAt: '2026-04-27T14:22:00.000Z',
    revokedAt: null,
    expiresAt: null,
    quotaMonthly: 100000,
    usageThisMonth: 24180,
  },
  {
    id: 'demo-2',
    keyPrefix: 'ez_pk_test_d4e5f6',
    name: 'Staging',
    appName: 'ezauth',
    scope: 'test',
    permissions: ['*'],
    status: 'active',
    createdAt: '2026-02-04T08:15:00.000Z',
    lastUsedAt: '2026-04-25T09:10:00.000Z',
    revokedAt: null,
    expiresAt: null,
    quotaMonthly: 10000,
    usageThisMonth: 482,
  },
  {
    id: 'demo-3',
    keyPrefix: 'ez_pk_live_x9y8z7',
    name: 'Old key',
    appName: 'ezauth',
    scope: 'live',
    permissions: ['*'],
    status: 'revoked',
    createdAt: '2025-11-20T12:00:00.000Z',
    lastUsedAt: '2026-01-08T03:45:00.000Z',
    revokedAt: '2026-01-09T10:00:00.000Z',
    expiresAt: null,
    quotaMonthly: 50000,
    usageThisMonth: 12300,
  },
]

const mockTexts = {
  name: 'Name',
  keyPrefix: 'Prefix',
  status: 'Status',
  created: 'Created',
  lastUsed: 'Last used',
  actions: 'Actions',
  never: 'Never',
  usage: 'Usage',
  statusActive: 'Active',
  statusRevoked: 'Revoked',
  rotate: 'Rotate',
  revoke: 'Revoke',
  unlimited: 'Unlimited',
}

export default function Demo() {
  return (
    <Div className="w-full max-w-4xl">
      <ApiKeysTable
        keys={mockKeys}
        onRevoke={() => {}}
        onRotate={() => {}}
        onViewUsage={() => {}}
        isRevoking={false}
        isRotating={false}
        texts={mockTexts}
      />
    </Div>
  )
}
