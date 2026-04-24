import { createRule } from './create-rule.js'

/**
 * Matches a Next.js web-app source folder inside the monorepo:
 * `apps/<app>/web/src/**`. Only files under that prefix are linted — the
 * rule must not fire on packages, SDK components, or dev tooling.
 */
const APP_WEB_SRC = /[\\/]apps[\\/][^\\/]+[\\/]web[\\/]src[\\/]/

const FORBIDDEN_SOURCE = 'next/link'
const REPLACEMENT_SOURCE = '@/i18n/navigation'

/**
 * Disallow `import Link from 'next/link'` in `apps/<app>/web/src/**`.
 *
 * All apps ship with `src/i18n/navigation.ts` (built via
 * `createNavigation(routing)` from `next-intl`). Importing the locale-aware
 * `Link` from there guarantees every href includes the active locale —
 * hitting `/en/foo` directly instead of going through the `/foo → /en/foo`
 * 307 redirect that bare `next/link` produces.
 *
 * Autofix: rewrites the default import to a named import from
 * `@/i18n/navigation`. Aliased imports (`import Link as NLink from ...`) are
 * flagged but not auto-rewritten — the maintainer must decide whether to
 * keep the alias.
 */
export const noNextLinkInLocaleApps = createRule({
  name: 'no-next-link-in-locale-apps',
  meta: {
    type: 'problem',
    docs: {
      description:
        "Disallow `import Link from 'next/link'` in apps/*/web/src — use the locale-aware `Link` from `@/i18n/navigation` instead.",
    },
    fixable: 'code',
    schema: [],
    messages: {
      forbidden:
        "Import `Link` from '@/i18n/navigation' (locale-aware) instead of 'next/link' — bare next/link emits hrefs without the active locale and triggers a 307 redirect.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (!APP_WEB_SRC.test(filename)) return {}

    return {
      ImportDeclaration(node) {
        if (node.source.value !== FORBIDDEN_SOURCE) return

        // Only care about the default import binding named `Link`.
        const defaultSpec = node.specifiers.find(spec => spec.type === 'ImportDefaultSpecifier')
        if (!defaultSpec || defaultSpec.local.name !== 'Link') return

        const namedSpecs = node.specifiers.filter(spec => spec.type === 'ImportSpecifier')

        context.report({
          node: defaultSpec,
          messageId: 'forbidden',
          fix(fixer) {
            // If there are named imports (e.g. `import Link, { LinkProps } from 'next/link'`),
            // keep them on the original declaration and insert a new import
            // for Link from the i18n navigation module. Otherwise, replace
            // the entire declaration.
            if (namedSpecs.length === 0) {
              return fixer.replaceText(node, `import { Link } from '${REPLACEMENT_SOURCE}'`)
            }

            const namedList = namedSpecs
              .map(spec => {
                if (spec.type !== 'ImportSpecifier') return ''
                const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : ''
                const localName = spec.local.name
                return importedName === localName ? importedName : `${importedName} as ${localName}`
              })
              .filter(Boolean)
              .join(', ')

            return fixer.replaceText(
              node,
              `import { ${namedList} } from '${FORBIDDEN_SOURCE}'\nimport { Link } from '${REPLACEMENT_SOURCE}'`
            )
          },
        })
      },
    }
  },
})
