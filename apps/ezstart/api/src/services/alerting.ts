import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

interface AlertConfig {
  email?: {
    enabled: boolean
    from: string
    to: string[]
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
  }
  slack?: {
    enabled: boolean
    webhookUrl: string
  }
}

interface Alert {
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  service?: string
  timestamp: Date
  metadata?: Record<string, any>
}

class AlertingService {
  private emailTransporter: Transporter | null = null
  private config: AlertConfig

  constructor() {
    // Load config from environment
    this.config = {
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        from: process.env.ALERT_EMAIL_FROM || 'monitoring@ezstart.xyz',
        to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean),
        smtpHost: process.env.ALERT_SMTP_HOST || 'smtp.gmail.com',
        smtpPort: Number(process.env.ALERT_SMTP_PORT) || 587,
        smtpUser: process.env.ALERT_SMTP_USER,
        smtpPass: process.env.ALERT_SMTP_PASS,
      },
      slack: {
        enabled: process.env.ALERT_SLACK_ENABLED === 'true',
        webhookUrl: process.env.ALERT_SLACK_WEBHOOK || '',
      },
    }

    // Initialize email transporter if enabled
    if (this.config.email?.enabled && this.config.email?.smtpUser && this.config.email?.smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.email?.smtpHost,
        port: this.config.email?.smtpPort,
        secure: this.config.email?.smtpPort === 465,
        auth: {
          user: this.config.email?.smtpUser,
          pass: this.config.email?.smtpPass,
        },
      })
    }
  }

  /**
   * Send an alert through all enabled channels
   */
  async sendAlert(alert: Alert): Promise<void> {
    const results = await Promise.allSettled([
      this.sendEmailAlert(alert),
      this.sendSlackAlert(alert),
    ])

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const channel = index === 0 ? 'email' : 'slack'
        console.error(`[Alerting] Failed to send ${channel} alert:`, result.reason)
      }
    })
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.config.email?.enabled || !this.emailTransporter) {
      return
    }

    if (this.config.email.to?.length === 0) {
      console.warn('[Alerting] No email recipients configured')
      return
    }

    const severityColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .meta { background: white; padding: 15px; margin-top: 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
          .meta-item { margin: 8px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
          .badge-${alert.severity} { background: ${severityColors[alert.severity]}; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">${alert.title}</h1>
            <div style="margin-top: 8px;">
              <span class="badge badge-${alert.severity}">${alert.severity.toUpperCase()}</span>
            </div>
          </div>
          <div class="content">
            <p>${alert.message}</p>

            <div class="meta">
              <div class="meta-item">
                <span class="label">Service:</span> ${alert.service || 'N/A'}
              </div>
              <div class="meta-item">
                <span class="label">Time:</span> ${alert.timestamp.toLocaleString()}
              </div>
              ${alert.metadata ? `
              <div class="meta-item" style="margin-top: 15px;">
                <span class="label">Details:</span>
                <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
              </div>
              ` : ''}
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>EZStart Monitoring System | <a href="https://www.ezstart.xyz/monitoring" style="color: #3b82f6;">View Dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `

    await this.emailTransporter.sendMail({
      from: this.config.email?.from,
      to: this.config.email?.to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html,
    })

    console.log(`[Alerting] Email alert sent to ${this.config.email?.to?.length} recipient(s)`)
  }

  /**
   * Send Slack alert via webhook
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    if (!this.config.slack?.enabled || !this.config.slack?.webhookUrl) {
      return
    }

    const severityEmojis = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    }

    const severityColors = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#dc2626',
    }

    const payload = {
      attachments: [
        {
          color: severityColors[alert.severity],
          title: `${severityEmojis[alert.severity]} ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Service',
              value: alert.service || 'N/A',
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Time',
              value: alert.timestamp.toLocaleString(),
              short: false,
            },
          ],
          footer: 'EZStart Monitoring',
          footer_icon: 'https://www.ezstart.xyz/favicon.ico',
          ts: Math.floor(alert.timestamp.getTime() / 1000),
        },
      ],
    }

    const response = await fetch(this.config.slack?.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`)
    }

    console.log('[Alerting] Slack alert sent successfully')
  }

  /**
   * Test alerting system
   */
  async testAlerts(): Promise<{ email: boolean; slack: boolean }> {
    const testAlert: Alert = {
      title: 'Test Alert - Monitoring System',
      message: 'This is a test alert to verify that the alerting system is working correctly.',
      severity: 'info',
      service: 'monitoring-api',
      timestamp: new Date(),
      metadata: {
        test: true,
        environment: process.env.NODE_ENV,
      },
    }

    const results = {
      email: false,
      slack: false,
    }

    try {
      await this.sendEmailAlert(testAlert)
      results.email = true
    } catch (error) {
      console.error('[Alerting] Email test failed:', error)
    }

    try {
      await this.sendSlackAlert(testAlert)
      results.slack = true
    } catch (error) {
      console.error('[Alerting] Slack test failed:', error)
    }

    return results
  }

  /**
   * Get alerting configuration status
   */
  getStatus() {
    return {
      email: {
        enabled: this.config.email?.enabled,
        configured: !!this.emailTransporter,
        recipients: this.config.email?.to?.length,
      },
      slack: {
        enabled: this.config.slack?.enabled,
        configured: !!this.config.slack?.webhookUrl,
      },
    }
  }
}

// Singleton instance
export const alertingService = new AlertingService()

// Alert helper functions
export async function alertServiceDown(serviceId: string, error: string) {
  await alertingService.sendAlert({
    title: `Service Down: ${serviceId}`,
    message: `The service ${serviceId} is not responding. Please investigate immediately.`,
    severity: 'critical',
    service: serviceId,
    timestamp: new Date(),
    metadata: { error },
  })
}

export async function alertHighResponseTime(serviceId: string, responseTime: number, threshold: number) {
  await alertingService.sendAlert({
    title: `High Response Time: ${serviceId}`,
    message: `Response time (${responseTime}ms) exceeded threshold (${threshold}ms) for ${serviceId}.`,
    severity: 'warning',
    service: serviceId,
    timestamp: new Date(),
    metadata: { responseTime, threshold },
  })
}

export async function alertErrorRate(serviceId: string, errorRate: number, threshold: number) {
  await alertingService.sendAlert({
    title: `High Error Rate: ${serviceId}`,
    message: `Error rate (${errorRate.toFixed(2)}%) exceeded threshold (${threshold}%) for ${serviceId}.`,
    severity: 'error',
    service: serviceId,
    timestamp: new Date(),
    metadata: { errorRate, threshold },
  })
}
