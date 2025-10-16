import { baseConfig } from '@ezstart/next-config/base.js'
import deepmerge from 'deepmerge'

/** @type {import('next').NextConfig} */
const nextConfig = deepmerge(baseConfig, {
  transpilePackages: ['@ezstart/pay-sdk', '@ezstart/next-theme'],
  eslint: {
    ignoreDuringBuilds: true
  }
})

export default nextConfig
