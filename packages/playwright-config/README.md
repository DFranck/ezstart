# @ezstart/playwright-config

**Centralized Playwright configuration for @ezstart monorepo**

This package provides a shared Playwright configuration for E2E testing across all web applications. Following the "single source of truth" principle, all Playwright settings are centralized here to ensure consistent E2E testing practices.

---

## 📦 Installation

```bash
# Already installed via workspace
pnpm add -D @ezstart/playwright-config @playwright/test
```

---

## 🚀 Quick Start

### Create playwright.config.ts in your app

```typescript
// apps/[app]/web/playwright.config.ts
import { defineConfig } from '@playwright/test'
import baseConfig from '@ezstart/playwright-config'

export default defineConfig({
  ...baseConfig,
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:5025', // Your app's port
  },
  webServer: {
    command: 'pnpm dev',
    port: 5025,
    reuseExistingServer: !process.env.CI,
  },
})
```

### Write E2E tests

```typescript
// apps/ezbill/web/e2e/invoice-flow.spec.ts
import { test, expect } from '@playwright/test'

test('creates an invoice', async ({ page }) => {
  await page.goto('/')
  await page.click('text=New Invoice')

  await page.fill('[name="clientName"]', 'Test Client')
  await page.fill('[name="amount"]', '100')
  await page.click('button[type="submit"]')

  await expect(page.locator('text=Invoice created')).toBeVisible()
})
```

### Run tests

```bash
# Run all E2E tests
pnpm exec playwright test

# Run in UI mode (interactive)
pnpm exec playwright test --ui

# Run specific browser
pnpm exec playwright test --project=chromium
```

---

## ⚙️ Base Configuration

The base config includes:

```typescript
{
  testDir: './e2e',                    // E2E tests location
  fullyParallel: true,                 // Run tests in parallel
  forbidOnly: !!process.env.CI,        // Prevent .only() in CI
  retries: process.env.CI ? 2 : 0,     // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Sequential in CI, parallel locally
  reporter: 'html',                     // HTML report

  use: {
    trace: 'on-first-retry',           // Traces for debugging failures
    screenshot: 'only-on-failure',     // Screenshots on failure
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
}
```

---

## 🎨 Customization

### Override specific settings

```typescript
// apps/[app]/web/playwright.config.ts
import { defineConfig } from '@playwright/test'
import baseConfig from '@ezstart/playwright-config'

export default defineConfig({
  ...baseConfig,

  // Override test directory
  testDir: './tests/e2e',

  // Override timeout
  timeout: 60000, // 60s instead of default 30s

  // Add custom projects (mobile)
  projects: [
    ...baseConfig.projects,
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Custom reporter
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
  ],
})
```

### Add global setup

```typescript
// apps/[app]/web/playwright.config.ts
export default defineConfig({
  ...baseConfig,
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
})
```

```typescript
// apps/[app]/web/global-setup.ts
export default async function globalSetup() {
  console.log('🚀 Starting E2E test server...')
  // Your setup code (seed database, start mock servers, etc.)
}
```

---

## 🧪 Best Practices

### 1. Use Page Object Model

```typescript
// apps/[app]/web/e2e/pages/InvoicePage.ts
import { Page, Locator } from '@playwright/test'

export class InvoicePage {
  readonly page: Page
  readonly newInvoiceButton: Locator
  readonly clientNameInput: Locator

  constructor(page: Page) {
    this.page = page
    this.newInvoiceButton = page.locator('text=New Invoice')
    this.clientNameInput = page.locator('[name="clientName"]')
  }

  async createInvoice(clientName: string, amount: number) {
    await this.newInvoiceButton.click()
    await this.clientNameInput.fill(clientName)
    await this.page.fill('[name="amount"]', amount.toString())
    await this.page.click('button[type="submit"]')
  }
}
```

**Usage:**
```typescript
// apps/[app]/web/e2e/invoice.spec.ts
import { test, expect } from '@playwright/test'
import { InvoicePage } from './pages/InvoicePage'

test('creates invoice', async ({ page }) => {
  const invoicePage = new InvoicePage(page)
  await page.goto('/')

  await invoicePage.createInvoice('Test Client', 100)

  await expect(page.locator('text=Invoice created')).toBeVisible()
})
```

### 2. Use Fixtures for Authentication

```typescript
// apps/[app]/web/e2e/fixtures/auth.ts
import { test as base } from '@playwright/test'

export const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')

    await use(page)
  },
})
```

**Usage:**
```typescript
import { test, expect } from './fixtures/auth'

test('creates invoice as authenticated user', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/invoices')
  // User is already logged in
})
```

### 3. Leverage Test Data from test-utils

```typescript
// apps/ezbill/web/e2e/invoice.spec.ts
import { test, expect } from '@playwright/test'
import { createTestInvoice } from '@ezbill/test-utils'

test('displays invoice details', async ({ page }) => {
  const invoice = createTestInvoice({ total: 150 })

  // Seed database with test invoice
  await seedInvoice(invoice)

  await page.goto(`/invoices/${invoice._id}`)

  await expect(page.locator('text=$150.00')).toBeVisible()
})
```

---

## 📊 CI Integration

### GitHub Actions

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps
      - run: pnpm exec playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🎯 Projects Configuration

The base config includes 3 browser projects:

| Project | Browser | Engine |
|---------|---------|--------|
| chromium | Google Chrome | Blink |
| firefox | Mozilla Firefox | Gecko |
| webkit | Safari | WebKit |

**Run specific project:**
```bash
pnpm exec playwright test --project=chromium
```

**Skip specific project:**
```bash
pnpm exec playwright test --project=chromium --project=firefox
```

---

## 📁 Recommended Structure

```
apps/[app]/web/
├── e2e/
│   ├── pages/               # Page Object Models
│   │   ├── InvoicePage.ts
│   │   └── ClientPage.ts
│   ├── fixtures/            # Custom fixtures
│   │   └── auth.ts
│   ├── helpers/             # Test helpers
│   │   └── seed.ts
│   └── *.spec.ts            # Test files
├── playwright.config.ts     # Extends @ezstart/playwright-config
└── global-setup.ts          # Optional global setup
```

---

## 🔗 Related Packages

- **[@ezstart/test-utils](../test-utils/README.md)** - Generic test infrastructure
- **[@ezbill/test-utils](../../apps/ezbill/test-utils/README.md)** - EZBill-specific test utilities

---

## 📦 Used By

- `apps/ezbill/web` - EZBill E2E tests
- `apps/ezauth/web` - EZAuth E2E tests
- `apps/ezpay/web` - EZPay E2E tests
- `apps/ezstart/web` - EZStart E2E tests

---

## 📝 Notes

- Playwright downloads browser binaries on first install (~500MB)
- Tests run in headless mode by default
- Use `--headed` flag to see browser: `pnpm exec playwright test --headed`
- HTML report opens automatically after test run
- Traces are saved only on first retry to save disk space

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
**Maintainer:** @ezstart monorepo team
