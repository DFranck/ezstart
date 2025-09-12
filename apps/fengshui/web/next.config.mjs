/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ui', '@ezstart/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
}

// PWA retiré pour fengshui - on a validé que l'architecture fonctionne
// Chaque app peut ajouter PWA individuellement si nécessaire
export default baseConfig
