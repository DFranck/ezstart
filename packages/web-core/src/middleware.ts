import createMiddleware from 'next-intl/middleware'
import { defaultRouting } from './i18n/routing.js'

export const createIntlMiddleware = (routing = defaultRouting) => {
  return createMiddleware(routing)
}

export default createIntlMiddleware()