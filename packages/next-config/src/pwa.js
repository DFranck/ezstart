import { baseConfig } from './base.js'

/** @type {import('next').NextConfig} */
export const pwaConfig = {
  ...baseConfig,
  
  // Configuration spécifique PWA
  images: {
    remotePatterns: [
      // Patterns communs pour les PWA
      {
        protocol: 'https',
        hostname: '**',
      }
    ],
  },

  // Service Worker et PWA optimizations
  async rewrites() {
    return [
      // Supportt pour les PWA offline
      {
        source: '/sw.js',
        destination: '/_next/static/sw.js',
      }
    ]
  }
}

export default pwaConfig