/** @type {import('next').NextConfig} */
export const baseConfig = {
  // Packages du monorepo à transpiler
  transpilePackages: ['@ezstart/ui', '@ezstart/types', '@ezstart/auth-sdk'],
  
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