import { noRawHtml } from '../rules/no-raw-html.js'
import { ruleTester } from './rule-tester.js'

const APP_FILE = '/repo/apps/myapp/web/src/components/Page.tsx'
const PACKAGE_FILE = '/repo/packages/ui/src/components/Card.tsx'

ruleTester.run('no-raw-html', noRawHtml, {
  valid: [
    // Outside apps/*/web/src — rule ignores it.
    {
      filename: PACKAGE_FILE,
      code: 'export const Card = () => <p>hi</p>',
    },
    // UI components from @ezstart/ui.
    {
      filename: APP_FILE,
      code: 'const Page = () => <P>hi</P>',
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <Button>click</Button>',
    },
    // Layout-level tags are allowed.
    {
      filename: APP_FILE,
      code: 'const Page = () => <main><section><article><ul><li>x</li></ul></article></section></main>',
    },
    // <div> is deliberately allowed (layout shell).
    {
      filename: APP_FILE,
      code: 'const Page = () => <div className="wrapper" />',
    },
  ],
  invalid: [
    {
      filename: APP_FILE,
      code: 'const Page = () => <p>hi</p>',
      errors: [{ messageId: 'rawHtml' }],
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <h1>Title</h1>',
      errors: [{ messageId: 'rawHtml' }],
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <button onClick={() => {}}>x</button>',
      errors: [{ messageId: 'rawHtml' }],
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <input type="text" />',
      errors: [{ messageId: 'rawHtml' }],
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <a href="/x">link</a>',
      errors: [{ messageId: 'rawHtml' }],
    },
    {
      filename: APP_FILE,
      code: 'const Page = () => <span>x</span>',
      errors: [{ messageId: 'rawHtml' }],
    },
  ],
})
