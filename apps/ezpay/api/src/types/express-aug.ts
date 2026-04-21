/**
 * Express Request augmentation for EZPay API.
 *
 * The base `Request.userId` / `Request.user` augmentation is provided by
 * `@ezstart/api-core` (and its shared `createEzstartAuth` middleware).
 * This file adds EZPay-specific fields populated by the api-key middleware
 * when a request is authenticated via `X-API-Key` / `Authorization: ApiKey`.
 *
 * @module apps/ezpay/api/src/types/express-aug
 */

declare global {
  namespace Express {
    interface Request {
      /** Mongo `_id` of the validated `ApiKey` document (ezpay DB). */
      apiKeyId?: string
      /** Stringified owner `auth_users._id` cached on the ApiKey. */
      apiKeyUserId?: string
      /** Ezauth Application id referenced by the key. */
      apiKeyApplicationId?: string
      /** Denormalised `application.slug` cached on the ApiKey. */
      apiKeyAppSlug?: string
      /** Permission scope attached to the key — metadata only. */
      apiKeyScope?: 'admin' | 'user' | 'readonly'
    }
  }
}

export {}
