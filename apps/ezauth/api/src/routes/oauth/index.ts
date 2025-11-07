import googleAuthorizeRouter from './google-authorize.js'
import googleCallbackRouter from './google-callback.js'

export const oauthRegistries: never[] = []

export const oauthRouters = [
  googleAuthorizeRouter,
  googleCallbackRouter
]
