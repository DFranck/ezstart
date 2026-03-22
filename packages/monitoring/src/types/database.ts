/**
 * Types for database monitoring
 */

export type DatabaseType = 'mongodb' | 'postgres' | 'redis'

export interface DatabaseConfig {
  name: string
  type: DatabaseType
  host: string
  port: number
  database: string
  collections?: string[] // for MongoDB
  tables?: string[] // for Postgres
}

export interface DatabaseHealth {
  name: string
  type: DatabaseType
  status: 'connected' | 'disconnected' | 'error'
  responseTime: number | null // ms
  connections: {
    active: number
    idle: number
    total: number
  } | null
  storage: {
    used: number // MB
    total: number // MB
    percentage: number
  } | null
  lastChecked: Date
  error: string | null
}

export interface DatabaseStats {
  name: string
  type: DatabaseType
  collections?: {
    name: string
    documentCount: number
    avgDocumentSize: number // bytes
    totalSize: number // MB
    indexes: number
  }[]
  tables?: {
    name: string
    rowCount: number
    totalSize: number // MB
    indexes: number
  }[]
}

// Database configurations from the monorepo
export const DATABASE_CONFIGS: DatabaseConfig[] = [
  {
    name: 'EZAuth MongoDB',
    type: 'mongodb',
    host: 'cluster0.mongodb.net', // example
    port: 27017,
    database: 'ezauth',
    collections: ['users', 'sessions', 'auth_codes'],
  },
  {
    name: 'EZBill MongoDB',
    type: 'mongodb',
    host: 'cluster0.mongodb.net',
    port: 27017,
    database: 'ezbill',
    collections: ['clients', 'invoices', 'payments'],
  },
  {
    name: 'EZPay MongoDB',
    type: 'mongodb',
    host: 'cluster0.mongodb.net',
    port: 27017,
    database: 'ezpay',
    collections: ['payments', 'subscriptions', 'donations'],
  },
  {
    name: 'GreenPulse MongoDB',
    type: 'mongodb',
    host: 'cluster0.mongodb.net',
    port: 27017,
    database: 'green-pulse',
    collections: ['projects', 'metrics', 'recommendations'],
  },
]
