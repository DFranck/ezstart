import { noAlertConfirm } from './rules/no-alert-confirm.js'
import { noFetchClient } from './rules/no-fetch-client.js'
import { noRawFetch } from './rules/no-raw-fetch.js'
import { noRawHtml } from './rules/no-raw-html.js'
import { parseApiErrorRequired } from './rules/parse-api-error-required.js'

const PLUGIN_NAME = '@ezstart/ezstart'

const rules = {
  'no-fetch-client': noFetchClient,
  'no-raw-fetch': noRawFetch,
  'parse-api-error-required': parseApiErrorRequired,
  'no-raw-html': noRawHtml,
  'no-alert-confirm': noAlertConfirm,
} as const

/** All rules activated as `error`. */
const recommendedRules = {
  [`${PLUGIN_NAME}/no-fetch-client`]: 'error',
  [`${PLUGIN_NAME}/no-raw-fetch`]: 'error',
  [`${PLUGIN_NAME}/parse-api-error-required`]: 'error',
  [`${PLUGIN_NAME}/no-raw-html`]: 'error',
  [`${PLUGIN_NAME}/no-alert-confirm`]: 'error',
} as const

const configs = {
  recommended: {
    plugins: [PLUGIN_NAME],
    rules: recommendedRules,
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
export { rules, configs }
export type Rules = typeof rules
export type Configs = typeof configs
