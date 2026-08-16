import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // The Next.js `server-only` package throws when imported from a
      // non-RSC context (which Vitest is). Alias it to an empty module so
      // server-only files (`packages/ai-sdk/src/server/*.ts`) can be
      // imported from test files without forcing each suite to mock it.
      'server-only': new URL('./src/__tests__/_stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
  },
})
