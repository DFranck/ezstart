/**
 * Identity-card plan badge resolution — covers the
 * USER-MENU-PLAN-BADGE-SUPERADMIN regression where a superadmin was
 * incorrectly shown a "Free" subscription tier badge.
 *
 * Resolution priority enforced by `<UserMenuV2>`:
 *   1. globalRoles.includes('superadmin') -> "Platform" (purple, Crown)
 *   2. any appRoles[*].includes('admin')  -> "Admin"    (info,   ShieldCheck)
 *   3. consumer-provided planLabel        -> subscription tier
 *   4. nothing                            -> no badge rendered
 *
 * Elevated roles override the `planLabel` prop because billing labels
 * are misleading for platform / app admins.
 */

import { describe, expect, it } from 'vitest'
import { resolvePlanBadge } from '../../components/user-menu-v2/UserMenuV2.js'
import { createTestUser } from '../helpers.js'

const TEXTS = { platformBadge: 'Platform', adminBadge: 'Admin' }

describe('UserMenuV2 — resolvePlanBadge', () => {
  it('returns Platform descriptor for superadmin (overrides planLabel)', () => {
    const user = createTestUser({ globalRoles: ['superadmin'] })
    const badge = resolvePlanBadge(user, 'Free', TEXTS)
    expect(badge).toEqual({
      label: 'Platform',
      variant: 'purple',
      icon: 'lucide:Crown',
    })
  })

  it('returns Admin descriptor for app-level admin (overrides planLabel)', () => {
    const user = createTestUser({
      globalRoles: ['user'],
      appRoles: { ezauth: ['admin'] },
    })
    const badge = resolvePlanBadge(user, 'Free', TEXTS)
    expect(badge).toEqual({
      label: 'Admin',
      variant: 'info',
      icon: 'lucide:ShieldCheck',
    })
  })

  it('returns Admin descriptor when admin role lives in any app entry', () => {
    const user = createTestUser({
      globalRoles: ['user'],
      appRoles: { someapp: ['user'], otherapp: ['admin', 'editor'] },
    })
    const badge = resolvePlanBadge(user, undefined, TEXTS)
    expect(badge?.label).toBe('Admin')
  })

  it('returns subscription planLabel for normal users (Pro)', () => {
    const user = createTestUser({ globalRoles: ['user'], appRoles: { ezauth: ['user'] } })
    const badge = resolvePlanBadge(user, 'Pro', TEXTS)
    expect(badge).toEqual({ label: 'Pro', variant: 'primary' })
  })

  it('returns subscription planLabel for normal users (Free → secondary variant)', () => {
    const user = createTestUser({ globalRoles: ['user'] })
    const badge = resolvePlanBadge(user, 'Free', TEXTS)
    expect(badge).toEqual({ label: 'Free', variant: 'secondary' })
  })

  it('returns subscription planLabel for normal users (Enterprise → purple variant)', () => {
    const user = createTestUser({ globalRoles: ['user'] })
    const badge = resolvePlanBadge(user, 'Enterprise', TEXTS)
    expect(badge).toEqual({ label: 'Enterprise', variant: 'purple' })
  })

  it('returns null when planLabel omitted and user has no elevated role', () => {
    const user = createTestUser({ globalRoles: ['user'] })
    expect(resolvePlanBadge(user, undefined, TEXTS)).toBeNull()
  })

  it('superadmin (priority 1) wins over app-level admin (priority 2)', () => {
    const user = createTestUser({
      globalRoles: ['superadmin'],
      appRoles: { ezauth: ['admin'] },
    })
    const badge = resolvePlanBadge(user, 'Enterprise', TEXTS)
    expect(badge?.label).toBe('Platform')
  })

  it('honors localized texts override (FR)', () => {
    const user = createTestUser({ globalRoles: ['superadmin'] })
    const badge = resolvePlanBadge(user, undefined, {
      platformBadge: 'Plateforme',
      adminBadge: 'Admin',
    })
    expect(badge?.label).toBe('Plateforme')
  })

  it('handles missing globalRoles + appRoles defensively (treats as normal user)', () => {
    const user = createTestUser({ globalRoles: undefined, appRoles: undefined })
    const badge = resolvePlanBadge(user, 'Pro', TEXTS)
    expect(badge).toEqual({ label: 'Pro', variant: 'primary' })
  })

  it('non-admin app roles do NOT trigger Admin badge', () => {
    const user = createTestUser({
      globalRoles: ['user'],
      appRoles: { ezauth: ['user', 'editor', 'viewer'] },
    })
    const badge = resolvePlanBadge(user, 'Free', TEXTS)
    expect(badge?.label).toBe('Free')
  })
})
