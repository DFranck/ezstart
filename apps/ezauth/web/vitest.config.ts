import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Client-side (jsdom) tests for the EZAuth web app.
 *
 * We intentionally only test isolated, app-owned primitives (hooks, utils).
 * Tests that cover SDK components live in `@ezstart/auth-sdk`.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    env: {
      NODE_ENV: 'test',
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
