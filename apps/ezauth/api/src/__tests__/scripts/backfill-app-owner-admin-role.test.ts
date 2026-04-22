import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Types } from 'mongoose'
import { setupTestDatabase, teardownTestDatabase } from '@ezstart/test-utils'
import { backfillAppOwnerAdminRole } from '../../scripts/backfill-app-owner-admin-role.js'
import { getApplicationModel } from '../../models/application.js'
import { getAuthUserModel } from '../../models/auth-user.js'

type ApplicationModelT = Awaited<ReturnType<typeof getApplicationModel>>
type AuthUserModelT = Awaited<ReturnType<typeof getAuthUserModel>>

async function insertUser(
  AuthUser: AuthUserModelT,
  overrides: {
    email: string
    username?: string
    apps?: string[]
    appRoles?: Record<string, string[]>
  }
) {
  return AuthUser.create({
    email: overrides.email,
    username: overrides.username ?? overrides.email.split('@')[0],
    passwordHash: 'hashed-placeholder',
    isVerified: true,
    apps: overrides.apps ?? [],
    appRoles: overrides.appRoles ?? {},
  })
}

async function insertApplication(
  Application: ApplicationModelT,
  overrides: {
    slug: string
    ownerId: string
    name?: string
    createdBy?: string
  }
) {
  return Application.create({
    slug: overrides.slug,
    name: overrides.name ?? overrides.slug,
    ownerId: overrides.ownerId,
    createdBy: overrides.createdBy ?? overrides.ownerId,
    status: 'active',
  })
}

describe('backfill-app-owner-admin-role script', () => {
  let Application: ApplicationModelT
  let AuthUser: AuthUserModelT

  beforeAll(async () => {
    await setupTestDatabase()
    Application = await getApplicationModel()
    AuthUser = await getAuthUserModel()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await Application.deleteMany({})
    await AuthUser.deleteMany({})
  })

  it('adds admin role to the owner when missing', async () => {
    const owner = await insertUser(AuthUser, { email: 'owner@test.com' })
    await insertApplication(Application, {
      slug: 'acme',
      ownerId: owner._id.toString(),
    })

    const result = await backfillAppOwnerAdminRole()

    expect(result.applicationsScanned).toBe(1)
    expect(result.rolesAdded).toBe(1)
    expect(result.appsAdded).toBe(1)
    expect(result.missingOwners).toBe(0)

    const refreshed = await AuthUser.findById(owner._id).lean()
    const roles = refreshed?.appRoles as unknown
    const acmeRoles =
      roles instanceof Map
        ? (roles.get('acme') ?? [])
        : ((roles as Record<string, string[]>)?.['acme'] ?? [])
    expect(acmeRoles).toContain('admin')
    expect(refreshed?.apps).toContain('acme')
  })

  it('is idempotent — second run yields zero changes', async () => {
    const owner = await insertUser(AuthUser, { email: 'owner@test.com' })
    await insertApplication(Application, {
      slug: 'acme',
      ownerId: owner._id.toString(),
    })

    await backfillAppOwnerAdminRole()
    const second = await backfillAppOwnerAdminRole()

    expect(second.applicationsScanned).toBe(1)
    expect(second.rolesAdded).toBe(0)
    expect(second.appsAdded).toBe(0)
    expect(second.missingOwners).toBe(0)
  })

  it('skips Applications with non-ObjectId ownerId (system)', async () => {
    await insertApplication(Application, {
      slug: 'ezauth',
      ownerId: 'system',
      createdBy: 'system-seed',
    })

    const result = await backfillAppOwnerAdminRole()

    expect(result.applicationsScanned).toBe(1)
    expect(result.missingOwners).toBe(1)
    expect(result.rolesAdded).toBe(0)
    expect(result.appsAdded).toBe(0)
  })

  it('mixes valid owners and system-owned apps without crashing', async () => {
    const owner = await insertUser(AuthUser, { email: 'owner@test.com' })
    await insertApplication(Application, {
      slug: 'ezauth',
      ownerId: 'system',
      createdBy: 'system-seed',
    })
    await insertApplication(Application, {
      slug: 'acme',
      ownerId: owner._id.toString(),
    })
    // Valid-looking ObjectId but user does not exist.
    await insertApplication(Application, {
      slug: 'ghost',
      ownerId: new Types.ObjectId().toString(),
    })

    const result = await backfillAppOwnerAdminRole()

    expect(result.applicationsScanned).toBe(3)
    expect(result.missingOwners).toBe(2) // system + ghost
    expect(result.rolesAdded).toBe(1)
    expect(result.appsAdded).toBe(1)

    const refreshed = await AuthUser.findById(owner._id).lean()
    const roles = refreshed?.appRoles as unknown
    const acmeRoles =
      roles instanceof Map
        ? (roles.get('acme') ?? [])
        : ((roles as Record<string, string[]>)?.['acme'] ?? [])
    expect(acmeRoles).toContain('admin')
  })
})
