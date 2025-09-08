/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ezstart/auth-sdk'],
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig