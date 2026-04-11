const DEFAULT_TRANSPILE_PACKAGES = ['@ezstart/ui', '@ezstart/auth-sdk', '@ezstart/capture-sdk']

/**
 * Create a base Next.js config with configurable options
 * @param {Object} [options]
 * @param {string[]} [options.transpilePackages] - Packages to transpile (default: ui + auth-sdk)
 * @returns {import('next').NextConfig}
 */
export function createBaseConfig(options = {}) {
  const { transpilePackages = DEFAULT_TRANSPILE_PACKAGES } = options

  return {
    transpilePackages,

    // Configuration ESLint standard
    eslint: {
      ignoreDuringBuilds: false,
    },

    // TypeScript strict pour tous
    typescript: {
      ignoreBuildErrors: false,
    },

    // Performance optimizations
    compiler: {
      removeConsole:
        process.env.NODE_ENV === 'production'
          ? {
              exclude: ['error', 'warn'],
            }
          : false,
    },

    // Disable source maps in production (saves ~5-10MB per app)
    productionBrowserSourceMaps: false,

    // Image Optimization
    images: {
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60 * 60 * 24 * 365,
      dangerouslyAllowSVG: true,
      contentDispositionType: 'attachment',
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // Headers sécurisés par défaut
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
          ],
        },
      ]
    },
  }
}

/** @type {import('next').NextConfig} */
export const baseConfig = createBaseConfig()

export default baseConfig
