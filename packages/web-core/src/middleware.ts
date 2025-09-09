import createMiddleware from 'next-intl/middleware'
import { defaultRouting } from './i18n/routing'

export const createIntlMiddleware = (routing = defaultRouting) => {
  return createMiddleware(routing)
}

export default createIntlMiddleware()