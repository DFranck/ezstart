/**
 * Types for audit system
 */

export type AuditType =
  | 'security'
  | 'performance'
  | 'architecture'
  | 'code-quality'
  | 'dependencies'
  | 'accessibility'
  | 'infrastructure'
  | 'api'
  | 'seo'
  | 'web-apps'
  | 'testing'
  | 'ux'
  | 'i18n'
  | 'monitoring'

export type AuditStatus = 'not-audited' | 'in-progress' | 'partial' | 'complete'

export type AuditPriority = 'critical' | 'high' | 'medium' | 'low'

export type AuditFrequency = 'weekly' | 'monthly' | 'quarterly' | 'as-needed'

export interface AuditMetadata {
  type: AuditType
  name: string
  emoji: string
  description: string
  frequency: AuditFrequency
  estimatedDuration: number // minutes
  filePath: string
}

export interface AuditResult {
  type: AuditType
  status: AuditStatus
  score: number | null // 0-100
  lastUpdated: Date | null
  nextDue: Date | null
  duration: number | null // minutes
  executor: string | null // who ran the audit
}

export interface AuditIssue {
  id: string
  auditType: AuditType
  title: string
  description: string
  priority: AuditPriority
  status: 'open' | 'in-progress' | 'resolved' | 'wont-fix'
  createdAt: Date
  resolvedAt: Date | null
  assignee: string | null
  tags: string[]
}

export interface AuditScoreBreakdown {
  category: string
  score: number
  maxScore: number
  issues: string[]
}

export interface AuditReport {
  id: string
  type: AuditType
  score: number
  status: AuditStatus
  executedAt: Date
  executedBy: string
  duration: number // minutes
  breakdown: AuditScoreBreakdown[]
  issues: AuditIssue[]
  recommendations: string[]
  nextSteps: string[]
}

export const AUDIT_METADATA: Record<AuditType, AuditMetadata> = {
  security: {
    type: 'security',
    name: 'Security Audit',
    emoji: '🔒',
    description: 'Authentication, secrets, CORS, vulnerabilities',
    frequency: 'weekly',
    estimatedDuration: 60,
    filePath: 'docs/audits/SECURITY-AUDIT.md',
  },
  performance: {
    type: 'performance',
    name: 'Performance Audit',
    emoji: '⚡',
    description: 'Bundle sizes, API times, optimization',
    frequency: 'monthly',
    estimatedDuration: 90,
    filePath: 'docs/audits/PERFORMANCE-AUDIT.md',
  },
  architecture: {
    type: 'architecture',
    name: 'Architecture Audit',
    emoji: '🏗️',
    description: 'Dependencies, structure, best practices',
    frequency: 'quarterly',
    estimatedDuration: 120,
    filePath: 'docs/audits/ARCHITECTURE-AUDIT.md',
  },
  'code-quality': {
    type: 'code-quality',
    name: 'Code Quality Audit',
    emoji: '✨',
    description: 'TypeScript, ESLint, tests, documentation',
    frequency: 'monthly',
    estimatedDuration: 90,
    filePath: 'docs/audits/CODE-QUALITY-AUDIT.md',
  },
  dependencies: {
    type: 'dependencies',
    name: 'Dependencies Audit',
    emoji: '📦',
    description: 'Outdated packages, vulnerabilities, licenses',
    frequency: 'weekly',
    estimatedDuration: 45,
    filePath: 'docs/audits/DEPENDENCIES-AUDIT.md',
  },
  accessibility: {
    type: 'accessibility',
    name: 'Accessibility Audit',
    emoji: '♿',
    description: 'WCAG compliance, keyboard nav, screen readers',
    frequency: 'quarterly',
    estimatedDuration: 120,
    filePath: 'docs/audits/ACCESSIBILITY-AUDIT.md',
  },
  infrastructure: {
    type: 'infrastructure',
    name: 'Infrastructure Audit',
    emoji: '🚀',
    description: 'Railway/Vercel, monitoring, backups',
    frequency: 'monthly',
    estimatedDuration: 90,
    filePath: 'docs/audits/INFRASTRUCTURE-AUDIT.md',
  },
  api: {
    type: 'api',
    name: 'API Audit',
    emoji: '🔌',
    description: 'OpenAPI, error handling, authentication',
    frequency: 'quarterly',
    estimatedDuration: 120,
    filePath: 'docs/audits/API-AUDIT.md',
  },
  seo: {
    type: 'seo',
    name: 'SEO Audit',
    emoji: '🔍',
    description: 'Meta tags, sitemaps, structured data',
    frequency: 'quarterly',
    estimatedDuration: 60,
    filePath: 'docs/audits/SEO-AUDIT.md',
  },
  'web-apps': {
    type: 'web-apps',
    name: 'Web Apps Audit',
    emoji: '🌐',
    description: 'App configs, PWA, deployment',
    frequency: 'as-needed',
    estimatedDuration: 90,
    filePath: 'docs/audits/WEB-APPS-AUDIT.md',
  },
  testing: {
    type: 'testing',
    name: 'Testing Audit',
    emoji: '🧪',
    description: 'Coverage, test quality, E2E tests',
    frequency: 'monthly',
    estimatedDuration: 120,
    filePath: 'docs/audits/TESTING-AUDIT.md',
  },
  ux: {
    type: 'ux',
    name: 'UX Audit',
    emoji: '🎨',
    description: 'User flows, design consistency, usability',
    frequency: 'quarterly',
    estimatedDuration: 150,
    filePath: 'docs/audits/UX-AUDIT.md',
  },
  i18n: {
    type: 'i18n',
    name: 'Internationalization Audit',
    emoji: '🌐',
    description: 'Translations, locale support, RTL',
    frequency: 'quarterly',
    estimatedDuration: 90,
    filePath: 'docs/audits/I18N-AUDIT.md',
  },
  monitoring: {
    type: 'monitoring',
    name: 'Monitoring Audit',
    emoji: '📊',
    description: 'Logging, error tracking, alerting',
    frequency: 'monthly',
    estimatedDuration: 60,
    filePath: 'docs/audits/MONITORING-AUDIT.md',
  },
}
