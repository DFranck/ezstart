import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      // Force test environment so the logger module-level dev/prod gating
      // is deterministic. Individual tests override per-case via vi.stubEnv.
      NODE_ENV: 'test',
    },
    include: ['src/__tests__/**/*.test.ts'],
  },
})
