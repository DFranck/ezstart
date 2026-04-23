import { noLocalUiComponents } from '../rules/no-local-ui-components.js'
import { ruleTester } from './rule-tester.js'

const APP_COMPONENTS_FILE = '/repo/apps/myapp/web/src/components/MyCard.tsx'
const APP_PAGE_FILE = '/repo/apps/myapp/web/src/app/page.tsx'
const PACKAGE_FILE = '/repo/packages/ui/src/components/Card.tsx'

ruleTester.run('no-local-ui-components', noLocalUiComponents, {
  valid: [
    // Outside apps/*/web/src/components/ — rule ignores entirely.
    {
      filename: APP_PAGE_FILE,
      code: 'const Page = () => <div className="flex items-center gap-4 p-8" />',
    },
    {
      filename: PACKAGE_FILE,
      code: 'export const Card = () => <div className="bg-card rounded-md p-4" />',
    },
    // Composition: only custom components used.
    {
      filename: APP_COMPONENTS_FILE,
      code: 'const X = () => <Card><H1>Hi</H1></Card>',
    },
    // Minimal className tokens (1-2) — not flagged.
    {
      filename: APP_COMPONENTS_FILE,
      code: 'const X = () => <div className="flex gap-2" />',
    },
    // Custom component with className — not flagged (not intrinsic).
    {
      filename: APP_COMPONENTS_FILE,
      code: 'const X = () => <Button className="bg-primary hover:bg-primary/90 text-primary-foreground p-4" />',
    },
  ],
  invalid: [
    // Heavy className on intrinsic div.
    {
      filename: APP_COMPONENTS_FILE,
      code: 'const X = () => <div className="flex items-center gap-4 rounded-md bg-card p-4" />',
      errors: [{ messageId: 'localVisual' }],
    },
    // Template literal.
    {
      filename: APP_COMPONENTS_FILE,
      code: 'const X = () => <div className={`flex items-center gap-4 rounded-md bg-card p-4`} />',
      errors: [{ messageId: 'localVisual' }],
    },
  ],
})
