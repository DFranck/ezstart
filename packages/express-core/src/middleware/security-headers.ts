/**
 * Security Headers Middleware
 *
 * Adds comprehensive security headers to all API responses
 * Based on OWASP recommendations and industry best practices
 *
 * Headers implemented:
 * - Content Security Policy (CSP)
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - X-XSS-Protection (Legacy XSS protection)
 * - Referrer-Policy (Privacy protection)
 * - Permissions-Policy (Feature access control)
 *
 * @see https://owasp.org/www-project-secure-headers/
 * @see https://securityheaders.com/
 */

import type { Request, Response, NextFunction } from 'express'

export interface SecurityHeadersOptions {
  /**
   * Enable/disable CSP header
   * @default true
   */
  csp?: boolean

  /**
   * CSP directives (only used if csp is true)
   * @default Strict defaults for APIs
   */
  cspDirectives?: {
    defaultSrc?: string[]
    scriptSrc?: string[]
    styleSrc?: string[]
    imgSrc?: string[]
    connectSrc?: string[]
    fontSrc?: string[]
    objectSrc?: string[]
    mediaSrc?: string[]
    frameSrc?: string[]
  }

  /**
   * Enable/disable HSTS header
   * @default true
   */
  hsts?: boolean

  /**
   * HSTS max age in seconds
   * @default 31536000 (1 year)
   */
  hstsMaxAge?: number

  /**
   * Include subdomains in HSTS
   * @default true
   */
  hstsIncludeSubdomains?: boolean

  /**
   * Preload HSTS (requires submission to hstspreload.org)
   * @default false
   */
  hstsPreload?: boolean

  /**
   * X-Frame-Options value
   * @default 'DENY'
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'

  /**
   * Referrer-Policy value
   * @default 'strict-origin-when-cross-origin'
   */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'

  /**
   * Permissions-Policy directives
   * @default Restrictive defaults
   */
  permissionsPolicy?: Record<string, string[]>
}

const DEFAULT_OPTIONS: Required<SecurityHeadersOptions> = {
  csp: true,
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for some frameworks
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
  hsts: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: false,
  frameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    'interest-cohort': [], // Disable FLoC
    payment: [],
    usb: [],
  },
}

/**
 * Generate CSP header value from directives
 */
function buildCSP(directives: Required<SecurityHeadersOptions>['cspDirectives']): string {
  const policies: string[] = []

  for (const [key, values] of Object.entries(directives)) {
    // Convert camelCase to kebab-case
    const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase()
    if (values && values.length > 0) {
      policies.push(`${directive} ${values.join(' ')}`)
    }
  }

  return policies.join('; ')
}

/**
 * Generate Permissions-Policy header value
 */
function buildPermissionsPolicy(policy: Record<string, string[]>): string {
  const policies: string[] = []

  for (const [feature, origins] of Object.entries(policy)) {
    if (origins.length === 0) {
      policies.push(`${feature}=()`)
    } else {
      policies.push(`${feature}=(${origins.join(' ')})`)
    }
  }

  return policies.join(', ')
}

/**
 * Security Headers Middleware Factory
 *
 * @example
 * ```typescript
 * import { securityHeaders } from '@ezstart/express-core'
 *
 * app.use(securityHeaders())
 * ```
 *
 * @example Custom configuration
 * ```typescript
 * app.use(securityHeaders({
 *   csp: true,
 *   cspDirectives: {
 *     defaultSrc: ["'self'"],
 *     scriptSrc: ["'self'", "'unsafe-inline'"],
 *     imgSrc: ["'self'", 'https://cdn.example.com'],
 *   },
 *   hstsMaxAge: 63072000, // 2 years
 *   hstsPreload: true,
 * }))
 * ```
 */
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }

  return (req: Request, res: Response, next: NextFunction) => {
    // Content Security Policy
    if (config.csp && config.cspDirectives) {
      const cspValue = buildCSP(config.cspDirectives)
      res.setHeader('Content-Security-Policy', cspValue)
    }

    // HTTP Strict Transport Security
    if (config.hsts) {
      let hstsValue = `max-age=${config.hstsMaxAge}`
      if (config.hstsIncludeSubdomains) {
        hstsValue += '; includeSubDomains'
      }
      if (config.hstsPreload) {
        hstsValue += '; preload'
      }
      res.setHeader('Strict-Transport-Security', hstsValue)
    }

    // X-Frame-Options (Clickjacking protection)
    res.setHeader('X-Frame-Options', config.frameOptions)

    // X-Content-Type-Options (MIME sniffing protection)
    res.setHeader('X-Content-Type-Options', 'nosniff')

    // X-XSS-Protection (Legacy, but still useful for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block')

    // Referrer-Policy
    res.setHeader('Referrer-Policy', config.referrerPolicy)

    // Permissions-Policy (formerly Feature-Policy)
    if (config.permissionsPolicy) {
      const permissionsPolicyValue = buildPermissionsPolicy(config.permissionsPolicy)
      res.setHeader('Permissions-Policy', permissionsPolicyValue)
    }

    // X-Powered-By (Remove to avoid information disclosure)
    res.removeHeader('X-Powered-By')

    next()
  }
}

/**
 * Preset configurations for common scenarios
 */
export const securityHeadersPresets = {
  /**
   * Strict security headers for public APIs
   * Maximum security, minimal features allowed
   */
  strict: (): SecurityHeadersOptions => ({
    csp: true,
    cspDirectives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'none'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
    hsts: true,
    hstsMaxAge: 63072000, // 2 years
    hstsIncludeSubdomains: true,
    hstsPreload: true,
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      'interest-cohort': [],
      payment: [],
      usb: [],
      bluetooth: [],
      midi: [],
    },
  }),

  /**
   * Moderate security headers for APIs with CORS
   * Allows cross-origin requests but maintains security
   */
  moderate: (): SecurityHeadersOptions => ({
    ...DEFAULT_OPTIONS,
    cspDirectives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'], // Allow HTTPS connections
      fontSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
    frameOptions: 'SAMEORIGIN',
  }),

  /**
   * Relaxed security headers for development
   * Use only in development environments!
   */
  development: (): SecurityHeadersOptions => ({
    csp: false, // Disable CSP in dev for easier debugging
    hsts: false, // Disable HSTS in dev (localhost uses HTTP)
    frameOptions: 'SAMEORIGIN',
    referrerPolicy: 'no-referrer-when-downgrade',
    permissionsPolicy: {},
  }),
}
