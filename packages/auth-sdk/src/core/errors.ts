/**
 * Auth-specific error class.
 *
 * Carries an HTTP status code so consumers can distinguish 401 (re-auth)
 * from 403 (forbidden) from generic failures.
 */
export class AuthError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(message: string, status: number = 0, code?: string) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
  }

  /** Type guard. */
  static isAuthError(err: unknown): err is AuthError {
    return err instanceof AuthError
  }
}
