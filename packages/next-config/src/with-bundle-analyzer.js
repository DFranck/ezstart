import bundleAnalyzer from '@next/bundle-analyzer'

/**
 * Wrapper to enable bundle analyzer when ANALYZE=true
 *
 * Usage:
 *   ANALYZE=true pnpm build
 *
 * This will generate .next/analyze/client.html and server.html
 * with interactive visualizations of bundle sizes
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

export default withBundleAnalyzer
