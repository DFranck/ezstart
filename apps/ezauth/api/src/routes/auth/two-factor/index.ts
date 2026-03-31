import setupRouter, { twoFactorSetupRegistry } from './setup.js'
import verifyRouter, { twoFactorVerifyRegistry } from './verify.js'
import disableRouter, { twoFactorDisableRegistry } from './disable.js'
import validateRouter, { twoFactorValidateRegistry } from './validate.js'
import statusRouter, { twoFactorStatusRegistry } from './status.js'

export const twoFactorRegistries = [
  twoFactorSetupRegistry,
  twoFactorVerifyRegistry,
  twoFactorDisableRegistry,
  twoFactorValidateRegistry,
  twoFactorStatusRegistry,
]

export const twoFactorRouters = [
  setupRouter,
  verifyRouter,
  disableRouter,
  validateRouter,
  statusRouter,
]
