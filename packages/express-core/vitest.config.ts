import { defineConfig } from 'vitest/config'

// Force NODE_ENV=test to comply with data-protection rules. No .env.test is
// loaded here because @ezstart/express-core has no database/production side
// effects of its own — tests cover pure logic (OpenAPI registry, routing).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
  },
})
