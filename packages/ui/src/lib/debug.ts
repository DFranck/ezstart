/**
 * Checks if debug mode is enabled via NEXT_PUBLIC_DEBUG environment variable.
 *
 * @returns true if NEXT_PUBLIC_DEBUG === 'true', false otherwise
 *
 * @example
 * if (isDebug()) {
 *   console.log('Debug info:', data)
 * }
 */
export const isDebug = (): boolean => process.env.NEXT_PUBLIC_DEBUG === 'true';

/**
 * Checks if the application is running in development mode.
 *
 * @returns true if NODE_ENV === 'development', false otherwise
 *
 * @example
 * if (isDevEnv()) {
 *   console.log('Running in development')
 * }
 */
export const isDevEnv = (): boolean => process.env.NODE_ENV === 'development';
