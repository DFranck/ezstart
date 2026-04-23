import { noConsoleLog } from '../rules/no-console-log.js'
import { ruleTester } from './rule-tester.js'

const SRC_FILE = '/repo/apps/myapp/web/src/page.ts'
const TEST_FILE = '/repo/apps/myapp/web/src/__tests__/page.test.ts'
const SPEC_FILE = '/repo/apps/myapp/web/src/page.spec.ts'
const SCRIPT_FILE = '/repo/scripts/seed.ts'
const BIN_FILE = '/repo/packages/config/bin/dev-server.js'
const LOGGER_FILE = '/repo/packages/logger/src/index.ts'
const CONFIG_FILE = '/repo/apps/myapp/web/next.config.mjs'

ruleTester.run('no-console-log', noConsoleLog, {
  valid: [
    // Tests allowed.
    { filename: TEST_FILE, code: "console.log('boom')" },
    { filename: SPEC_FILE, code: "console.warn('boom')" },
    // Scripts allowed.
    { filename: SCRIPT_FILE, code: "console.info('seeding...')" },
    // Bin entry points allowed.
    { filename: BIN_FILE, code: "console.log('starting dev server')" },
    // Logger itself allowed.
    { filename: LOGGER_FILE, code: "console.error('oops')" },
    // Config files allowed.
    { filename: CONFIG_FILE, code: "console.log('webpack warn')" },
    // logger.info is fine.
    {
      filename: SRC_FILE,
      code: "import { logger } from '@ezstart/logger'; logger.info('hi')",
    },
    // Custom object with a log method — not console.
    { filename: SRC_FILE, code: 'const foo = { log: () => {} }; foo.log()' },
  ],
  invalid: [
    {
      filename: SRC_FILE,
      code: "console.log('hi')",
      errors: [{ messageId: 'forbidden', data: { method: 'log' } }],
    },
    {
      filename: SRC_FILE,
      code: "console.warn('hi')",
      errors: [{ messageId: 'forbidden', data: { method: 'warn' } }],
    },
    {
      filename: SRC_FILE,
      code: "console.error('hi')",
      errors: [{ messageId: 'forbidden', data: { method: 'error' } }],
    },
    {
      filename: SRC_FILE,
      code: "console.info('hi')",
      errors: [{ messageId: 'forbidden', data: { method: 'info' } }],
    },
    {
      filename: SRC_FILE,
      code: "console.debug('hi')",
      errors: [{ messageId: 'forbidden', data: { method: 'debug' } }],
    },
  ],
})
