/**
 * Tests for `connectToMongo` — fail-close semantics added in Wave B Lot 1
 * (hacker report H2: silent Atlas → localhost fallback in production).
 *
 * Strategy
 * --------
 * The helper holds module-scoped state (`isConnecting`, `registeredDbName`)
 * AND mutates the shared `mongoose` singleton. We use `vi.resetModules()` +
 * a `vi.doMock('mongoose', ...)` per test so each test gets a fresh module
 * graph and a controllable mongoose stub. We assert on the LOG SHAPE (warn vs
 * error + content) because that is the operator-visible contract.
 *
 * We deliberately avoid spying on `process.exit` here: the production / test
 * branches now THROW (the fail-close fix), so we exercise those branches
 * directly. The dev branch still calls `process.exit(1)` only when BOTH the
 * primary AND the localhost fallback fail — covered by a dedicated test that
 * stubs `process.exit`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@ezstart/logger/server', () => ({
  logger: loggerMock,
}))

type ConnectImpl = (url: string, opts: unknown) => Promise<unknown>

/**
 * Build a fresh mongoose stub for one test. `connectImpl` controls
 * `mongoose.connect` (resolve / reject per call) so we can simulate Atlas
 * success / failure independently of the localhost fallback attempt.
 */
function buildMongooseStub(connectImpl: ConnectImpl) {
  const stub = {
    connection: {
      readyState: 0 as number,
      name: 'test-db',
      db: {
        admin: () => ({
          ping: async () => ({ ok: 1 }),
        }),
      },
      asPromise: vi.fn(async () => stub),
    },
    set: vi.fn(),
    connect: vi.fn(async (url: string, opts: unknown) => {
      const result = await connectImpl(url, opts)
      // Emulate mongoose marking the connection as live on success.
      stub.connection.readyState = 1
      return result
    }),
  }
  return stub
}

async function loadConnectToMongo(stub: ReturnType<typeof buildMongooseStub>) {
  vi.resetModules()
  vi.doMock('mongoose', () => ({
    default: stub,
    ...stub,
  }))
  const mod = await import('../connect-to-mongo.js')
  return mod.connectToMongo
}

describe('connectToMongo — fail-close in production (Wave B Lot 1 H2)', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalMongoUrl = process.env.MONGO_URL

  beforeEach(() => {
    Object.values(loggerMock).forEach(fn => fn.mockReset())
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    if (originalMongoUrl === undefined) {
      delete process.env.MONGO_URL
    } else {
      process.env.MONGO_URL = originalMongoUrl
    }
    vi.unstubAllGlobals()
  })

  it('throws when the primary connection fails AND NODE_ENV=production (no localhost fallback)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MONGO_URL =
      'mongodb+srv://user:pass@cluster.fake.mongodb.net/myapp?retryWrites=true'

    const stub = buildMongooseStub(async () => {
      throw new Error('ENOTFOUND cluster.fake.mongodb.net')
    })
    const connectToMongo = await loadConnectToMongo(stub)

    await expect(connectToMongo('myapp')).rejects.toThrow(/aborting boot/i)

    // Exactly one connect attempt — fallback to localhost must NOT have run.
    expect(stub.connect).toHaveBeenCalledTimes(1)
    // Production error log surfaces the refusal so operators see it.
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining('PRODUCTION: refusing to fall back to localhost')
    )
    // Credentials must NEVER appear in logs.
    const allLoggedStrings = JSON.stringify([
      loggerMock.error.mock.calls,
      loggerMock.warn.mock.calls,
      loggerMock.info.mock.calls,
    ])
    expect(allLoggedStrings).not.toContain('user:pass')
    expect(allLoggedStrings).not.toContain('cluster.fake.mongodb.net/myapp?retryWrites')
  })

  it('throws when connection fails AND NODE_ENV=test (no localhost fallback in test)', async () => {
    process.env.NODE_ENV = 'test'
    process.env.MONGO_URL = 'mongodb+srv://user:pass@cluster.fake.mongodb.net/myapp'

    const originalErr = new Error('test harness misconfigured')
    const stub = buildMongooseStub(async () => {
      throw originalErr
    })
    const connectToMongo = await loadConnectToMongo(stub)

    // Throws the original error (or a wrapped one) — never silently localhost.
    await expect(connectToMongo('myapp')).rejects.toThrow()

    expect(stub.connect).toHaveBeenCalledTimes(1)
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining('TEST: refusing to fall back to localhost')
    )
  })

  it('falls back to localhost in dev (NODE_ENV !== production && !== test) with a LOUD warn', async () => {
    process.env.NODE_ENV = 'development'
    process.env.MONGO_URL = 'mongodb+srv://user:pass@cluster.fake.mongodb.net/myapp'

    // Primary connect fails, second (localhost) attempt succeeds.
    let calls = 0
    const stub = buildMongooseStub(async (url: string) => {
      calls += 1
      if (calls === 1) throw new Error('ENOTFOUND')
      if (!url.includes('localhost:27017')) {
        throw new Error(`expected localhost fallback URL, got ${url}`)
      }
      return undefined
    })
    const connectToMongo = await loadConnectToMongo(stub)

    const result = await connectToMongo('myapp')
    expect(result).toBeDefined()

    // Two connect attempts: primary then localhost.
    expect(stub.connect).toHaveBeenCalledTimes(2)
    // The fallback was LOUD (warn), not silent (info).
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('DEV: Atlas/custom connection failed')
    )
    expect(loggerMock.warn).toHaveBeenCalledWith(expect.stringContaining('Fix MONGO_URL'))
  })

  it('exits the process in dev when BOTH the primary AND the localhost fallback fail', async () => {
    process.env.NODE_ENV = 'development'
    process.env.MONGO_URL = 'mongodb+srv://user:pass@cluster.fake.mongodb.net/myapp'

    const stub = buildMongooseStub(async () => {
      throw new Error('connection refused')
    })
    const connectToMongo = await loadConnectToMongo(stub)

    // Stub process.exit so the test runner does not actually exit. We make it
    // throw a sentinel so the call chain unwinds cleanly.
    const exitStub = vi.fn((_code?: number) => {
      throw new Error('__process_exit_called__')
    })
    vi.stubGlobal('process', { ...process, exit: exitStub })

    await expect(connectToMongo('myapp')).rejects.toThrow('__process_exit_called__')

    expect(exitStub).toHaveBeenCalledWith(1)
    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining('Cannot start API without database connection')
    )
  })

  it('connects successfully with no fallback path exercised when MONGO_URL is valid', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MONGO_URL =
      'mongodb+srv://user:pass@cluster.real.mongodb.net/myapp?retryWrites=true'

    const stub = buildMongooseStub(async () => undefined)
    const connectToMongo = await loadConnectToMongo(stub)

    const result = await connectToMongo('myapp')
    expect(result).toBeDefined()
    expect(stub.connect).toHaveBeenCalledTimes(1)
    // No error/warn — clean path.
    expect(loggerMock.error).not.toHaveBeenCalled()
    expect(loggerMock.warn).not.toHaveBeenCalled()
  })

  it('does NOT log the MONGO_URL value on failure (credentials must not leak)', async () => {
    process.env.NODE_ENV = 'production'
    const secretUrl = 'mongodb+srv://SUPERSECRETUSER:SUPERSECRETPASS@cluster.fake.mongodb.net/myapp'
    process.env.MONGO_URL = secretUrl

    const stub = buildMongooseStub(async () => {
      throw new Error('auth failed')
    })
    const connectToMongo = await loadConnectToMongo(stub)

    await expect(connectToMongo('myapp')).rejects.toThrow()

    const allLoggedStrings = JSON.stringify([
      loggerMock.error.mock.calls,
      loggerMock.warn.mock.calls,
      loggerMock.info.mock.calls,
    ])
    expect(allLoggedStrings).not.toContain('SUPERSECRETUSER')
    expect(allLoggedStrings).not.toContain('SUPERSECRETPASS')
  })
})
