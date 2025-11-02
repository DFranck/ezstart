import { getApiUrl } from '@ezstart/config'

export const MONITORING_API_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : getApiUrl('ezstart', 'production')
