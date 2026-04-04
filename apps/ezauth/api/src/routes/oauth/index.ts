import googleAuthorizeRouter, { googleAuthorizeRegistry } from './google-authorize.js'
import googleCallbackRouter, { googleCallbackRegistry } from './google-callback.js'

export const oauthRegistries = [googleAuthorizeRegistry, googleCallbackRegistry]

export const oauthRouters = [googleAuthorizeRouter, googleCallbackRouter]
