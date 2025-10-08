import withPWAPlugin from 'next-pwa'

/**
 * Helper pour ajouter PWA à la config Next.js
 * @param {import('next').NextConfig} config - Config Next.js de base
 * @param {Object} pwaOptions - Options PWA customisées
 * @returns {import('next').NextConfig} - Config avec PWA
 */
export function withPWA(config = {}, pwaOptions = {}) {
  const defaultPWAConfig = {
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    ...pwaOptions
  }

  return withPWAPlugin(defaultPWAConfig)(config)
}

export default withPWA
