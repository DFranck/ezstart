import { logger } from '@ezstart/logger/server'
import crypto from 'crypto'
import type { ESGPayload, ESGReportStatus } from '@green-pulse/types'

// ESG SaaS Integration Service
class ESGService {
  private baseUrl: string
  private clientId: string
  private clientSecret: string
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.baseUrl = process.env.ESG_BASE_URL || 'https://api.esg-saas.example'
    this.clientId = process.env.ESG_CLIENT_ID || ''
    this.clientSecret = process.env.ESG_CLIENT_SECRET || ''
  }

  // Get OAuth2 token
  private async getToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    try {
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      })

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.statusText}`)
      }

      const data = await response.json() as { access_token: string; expires_in: number }
      this.accessToken = data.access_token
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = new Date(Date.now() + (data.expires_in - 300) * 1000)

      return this.accessToken
    } catch (error) {
      logger.error('Failed to get ESG token:', error)
      throw new Error('ESG authentication failed')
    }
  }

  // Create or update project
  async createProject(payload: ESGPayload): Promise<{ project_id: string }> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        company: payload.company,
        sites: payload.sites,
        reporting_period: payload.period,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`)
    }

    return response.json() as Promise<{ project_id: string }>
  }

  // Push activity data
  async pushActivityData(
    projectId: string,
    payload: ESGPayload
  ): Promise<{ data_id: string; status: string }> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/activity-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        project_id: projectId,
        period: payload.period,
        scopes: payload.scopes,
        targets: payload.targets,
        evidence: payload.evidence,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to push activity data: ${response.statusText}`)
    }

    return response.json() as Promise<{ data_id: string; status: string }>
  }

  // Generate report
  async generateReport(
    projectId: string,
    standard: string = 'GHG-Protocol'
  ): Promise<ESGReportStatus> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        standard,
        format: 'pdf',
        include_recommendations: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate report: ${response.statusText}`)
    }

    const data = await response.json() as { job_id: string }

    return {
      job_id: data.job_id,
      status: 'pending' as const,
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Get report status
  async getReportStatus(jobId: string): Promise<ESGReportStatus> {
    const token = await this.getToken()

    const response = await fetch(`${this.baseUrl}/reports/${jobId}/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get report status: ${response.statusText}`)
    }

    const data = await response.json() as {
      status: 'pending' | 'processing' | 'completed' | 'failed'
      progress?: number
      report_url?: string
      error?: string
      created_at: string
      updated_at?: string
    }

    return {
      job_id: jobId,
      status: data.status,
      progress: data.progress || 0,
      report_url: data.report_url,
      error: data.error,
      created_at: data.created_at,
      updated_at: data.updated_at || new Date().toISOString(),
    }
  }

  // Process complete ESG workflow
  async processESGData(payload: ESGPayload): Promise<{
    project_id: string
    data_id: string
    job_id: string
  }> {
    try {
      // 1. Create/update project
      const { project_id } = await this.createProject(payload)
      logger.info(`✅ Project created/updated: ${project_id}`)

      // 2. Push activity data
      const { data_id } = await this.pushActivityData(project_id, payload)
      logger.info(`✅ Activity data pushed: ${data_id}`)

      // 3. Generate report
      const report = await this.generateReport(project_id)
      logger.info(`✅ Report generation started: ${report.job_id}`)

      return {
        project_id,
        data_id,
        job_id: report.job_id,
      }
    } catch (error) {
      logger.error('ESG processing failed:', error)
      throw error
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.WEBHOOK_SIGNING_SECRET || ''
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}

export const esgService = new ESGService()