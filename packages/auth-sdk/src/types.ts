/**
 * Type re-exports for backward compatibility.
 *
 * Core types are defined in `core/types.ts` (agnostic, no @ezstart/* deps).
 * This file re-exports them and adds aliases that consumers expect.
 */

// Re-export all core types
export type {
  AuthUser,
  AuthToken,
  AuthMode,
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthCode,
  AuthCodeResponse,
  JWTPayload,
  EmailOverrideRequest,
  QuickSignUpRequest,
  QuickSignUpResult,
  RefreshResult,
  AuthClientConfig,
  AuthStorage,
} from './core/types.js'

// Backward-compat alias used by some consumers
export type { SupportedLocale as SupportedEmailLocale } from '@ezstart/api-contracts'
