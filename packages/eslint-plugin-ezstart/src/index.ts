import { noAlertConfirm } from './rules/no-alert-confirm.js'
import { noConsoleLog } from './rules/no-console-log.js'
import { noDialogOutsideUi } from './rules/no-dialog-outside-ui.js'
import { noExpressCore } from './rules/no-express-core.js'
import { noFetchClient } from './rules/no-fetch-client.js'
import { noHardcodedTailwindColors } from './rules/no-hardcoded-tailwind-colors.js'
import { noLocalUiComponents } from './rules/no-local-ui-components.js'
import { noNextLinkInLocaleApps } from './rules/no-next-link-in-locale-apps.js'
import { noRawFetch } from './rules/no-raw-fetch.js'
import { noRawHtml } from './rules/no-raw-html.js'
import { parseApiErrorRequired } from './rules/parse-api-error-required.js'
import { requireI18nString } from './rules/require-i18n-string.js'

const PLUGIN_NAME = '@ezstart/ezstart'

const rules = {
  'no-express-core': noExpressCore,
  'no-fetch-client': noFetchClient,
  'no-raw-fetch': noRawFetch,
  'parse-api-error-required': parseApiErrorRequired,
  'no-raw-html': noRawHtml,
  'no-alert-confirm': noAlertConfirm,
  'no-console-log': noConsoleLog,
  'no-hardcoded-tailwind-colors': noHardcodedTailwindColors,
  'no-dialog-outside-ui': noDialogOutsideUi,
  'require-i18n-string': requireI18nString,
  'no-local-ui-components': noLocalUiComponents,
  'no-next-link-in-locale-apps': noNextLinkInLocaleApps,
} as const

/**
 * Recommended preset — all rules active with pragmatic severity.
 *
 * `error`: strict rules, zero tolerance (deprecated packages, fetch, parse-api).
 * `warn`: soft rules that expose existing debt (raw HTML, colors, console, i18n).
 */
const recommendedRules = {
  [`${PLUGIN_NAME}/no-express-core`]: 'error',
  [`${PLUGIN_NAME}/no-fetch-client`]: 'error',
  [`${PLUGIN_NAME}/no-raw-fetch`]: 'error',
  [`${PLUGIN_NAME}/parse-api-error-required`]: 'error',
  [`${PLUGIN_NAME}/no-raw-html`]: 'warn',
  [`${PLUGIN_NAME}/no-alert-confirm`]: 'error',
  [`${PLUGIN_NAME}/no-console-log`]: 'warn',
  [`${PLUGIN_NAME}/no-hardcoded-tailwind-colors`]: 'warn',
  [`${PLUGIN_NAME}/no-dialog-outside-ui`]: 'warn',
  [`${PLUGIN_NAME}/require-i18n-string`]: 'warn',
  [`${PLUGIN_NAME}/no-local-ui-components`]: 'warn',
  [`${PLUGIN_NAME}/no-next-link-in-locale-apps`]: 'error',
} as const

/**
 * Strict preset — every rule set to `error`. Opt-in for teams that have
 * cleared the existing debt.
 */
const strictRules = Object.fromEntries(
  Object.keys(recommendedRules).map(key => [key, 'error'])
) as Record<keyof typeof recommendedRules, 'error'>

const configs = {
  recommended: {
    plugins: [PLUGIN_NAME],
    rules: recommendedRules,
  },
  strict: {
    plugins: [PLUGIN_NAME],
    rules: strictRules,
  },
  /** Same as `recommended` for now. Reserved for future stricter rules. */
  all: {
    plugins: [PLUGIN_NAME],
    rules: recommendedRules,
  },
} as const

const plugin = {
  rules,
  configs,
}

export default plugin
export { configs, rules }
export type Rules = typeof rules
export type Configs = typeof configs
