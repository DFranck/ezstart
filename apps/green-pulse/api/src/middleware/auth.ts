import { createApiAuth, type RequestHandler } from '@ezstart/api-core'

// HAC-CRIT-2 — enforce iss/aud so an ezauth-issued token whose `aud` list
// omits `'green-pulse'` is rejected here as 401 (would otherwise be valid
// by signature alone given the shared `JWT_SECRET`).
const auth = createApiAuth({
  issuer: 'ezauth',
  audience: 'green-pulse',
})
export const authMiddleware: RequestHandler = auth.authMiddleware
export const optionalAuthMiddleware: RequestHandler = auth.optionalAuthMiddleware
