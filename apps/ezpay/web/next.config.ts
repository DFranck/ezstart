import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ezstart/ui', '@ezstart/pay-sdk'],
}

export default nextConfig
