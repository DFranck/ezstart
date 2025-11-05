/** @type {import('next').NextConfig} */
export const baseConfig = {
  // Packages du monorepo à transpiler
  transpilePackages: ['@ezstart/ui', '@ezstart/auth-sdk'],
  
  // Configuration ESLint standard
  eslint: {
    ignoreDuringBuilds: false // Forcer la validation pendant le build
  },
  
  // TypeScript strict pour tous
  typescript: {
    ignoreBuildErrors: false
  },

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false
  },

  // ⚡ CRITICAL: Disable source maps in production (saves ~5-10MB per app)
  // Source maps expose source code and add significant bundle size
  productionBrowserSourceMaps: false,

  // 🖼️ Image Optimization (Phase 2 - Nov 5, 2025)
  // Next.js automatically converts images to WebP/AVIF
  // Reduces image size by 30-80% without quality loss
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF first (best compression), fallback to WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840], // Responsive sizes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // Small images (icons, avatars)
    minimumCacheTTL: 60 * 60 * 24 * 365, // Cache optimized images for 1 year
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
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}

export default baseConfig