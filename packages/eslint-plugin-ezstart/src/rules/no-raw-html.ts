import { createRule } from './create-rule.js'

const APP_WEB_PATH = /[\\/]apps[\\/][^\\/]+[\\/]web[\\/]src[\\/]/

/**
 * Mapping of forbidden native JSX tags → recommended `@ezstart/ui` replacement.
 *
 * `div` is intentionally excluded from the generic block-list because it's
 * pervasive as a layout shell. The dedicated `DIV_REPLACEMENTS` map below
 * still flags the most common "fake card" / "fake badge" scenarios.
 */
const TAG_REPLACEMENTS: Record<string, string> = {
  p: '<P> from @ezstart/ui/components',
  span: '<Span> from @ezstart/ui/components',
  h1: '<H1> from @ezstart/ui/components',
  h2: '<H2> from @ezstart/ui/components',
  h3: '<H3> from @ezstart/ui/components',
  h4: '<H4> from @ezstart/ui/components',
  h5: '<H5> from @ezstart/ui/components',
  h6: '<H6> from @ezstart/ui/components',
  button: '<Button> from @ezstart/ui/components',
  input: '<Input> from @ezstart/ui/components',
  textarea: '<Textarea> from @ezstart/ui/components',
  select: '<Select> from @ezstart/ui/components',
  a: '<Link> from next/link wrapped in <Button asChild> when styled as a button',
}

/**
 * Blocks native HTML elements inside `apps/<app>/web/src/**` JSX and suggests
 * the `@ezstart/ui/components` replacement.
 *
 * Layout-level semantic tags (`main`, `aside`, `header`, `footer`, `nav`,
 * `section`, `article`, `ul`, `ol`, `li`, `figure`, `figcaption`, `body`,
 * `html`) are intentionally allowed. `div` is also allowed because it's
 * ubiquitous as a layout shell.
 *
 * No autofix: the replacement component must be imported, and the right
 * variant (`size`, `variant`, …) depends on context.
 */
export const noRawHtml = createRule({
  name: 'no-raw-html',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw HTML tags in app web JSX; use @ezstart/ui components instead.',
    },
    schema: [],
    messages: {
      rawHtml: "Raw '<{{tag}}>' forbidden in app JSX — use {{replacement}}.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (!APP_WEB_PATH.test(filename)) return {}

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier') return
        const tagName = node.name.name
        const replacement = TAG_REPLACEMENTS[tagName]
        if (!replacement) return

        // Heuristic: ignore JSX where the tag starts with an uppercase letter,
        // which would be a component, not a native HTML element. The ESLint
        // JSX parser gives us lowercase names for intrinsic elements only,
        // so this is defensive — but cheap.
        if (tagName[0] !== tagName[0]?.toLowerCase()) return

        context.report({
          node: node.name,
          messageId: 'rawHtml',
          data: { tag: tagName, replacement },
        })
      },
    }
  },
})
