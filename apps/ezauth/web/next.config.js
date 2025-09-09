import { baseConfig } from '@workspace/next-config/base.js'
import deepmerge from 'deepmerge'

/** @type {import('next').NextConfig} */
const nextConfig = deepmerge(baseConfig, {
  transpilePackages: ['@ezstart/auth-sdk'],
  eslint: {
    ignoreDuringBuilds: true
  }
})

export default nextConfig