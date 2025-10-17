import { getApiUrl } from '@ezstart/config'
import {
  H1,
  H2,
  P,
  Section,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { AuditCard } from './components/AuditCard'
import { HealthScore } from './components/HealthScore'
import { MetricsOverview } from './components/MetricsOverview'
import { ServiceCard } from './components/ServiceCard'

// Get monitoring API URL based on environment
// In Next.js SSR, we need to be explicit about the environment
const MONITORING_API_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5080' // Always use local in dev
    : getApiUrl('monitoring', 'production') // Explicit production in prod

async function getHealthChecks() {
  try {
    console.log('[Monitoring] Fetching health checks from:', MONITORING_API_URL)
    const res = await fetch(`${MONITORING_API_URL}/api/health-checks`, {
      cache: 'no-store',
    })
    console.log('[Monitoring] Health checks response status:', res.status)
    if (!res.ok) throw new Error(`Failed to fetch health checks: ${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.error('[Monitoring] Error fetching health checks:', error)
    if (error instanceof Error) {
      console.error('[Monitoring] Error details:', error.message, error.cause)
    }
    return { services: [] }
  }
}

async function getAudits() {
  try {
    console.log('[Monitoring] Fetching audits from:', MONITORING_API_URL)
    const res = await fetch(`${MONITORING_API_URL}/api/audits`, {
      cache: 'no-store',
    })
    console.log('[Monitoring] Audits response status:', res.status)
    if (!res.ok) throw new Error(`Failed to fetch audits: ${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.error('[Monitoring] Error fetching audits:', error)
    if (error instanceof Error) {
      console.error('[Monitoring] Error details:', error.message, error.cause)
    }
    return { audits: [] }
  }
}

async function getMetrics() {
  try {
    const res = await fetch(`${MONITORING_API_URL}/api/metrics`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Failed to fetch metrics')
    const data = await res.json()
    return data
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return null
  }
}

function calculateOverallHealth(services: any[]) {
  if (services.length === 0) return { score: 0, status: 'critical' as const }

  const healthyCount = services.filter(s => s.status === 'healthy').length
  const score = Math.round((healthyCount / services.length) * 100)

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  if (score >= 90) status = 'excellent'
  else if (score >= 70) status = 'good'
  else if (score >= 50) status = 'fair'
  else if (score >= 30) status = 'poor'
  else status = 'critical'

  return { score, status }
}

export default async function MonitoringPage() {
  const [healthData, auditsData] = await Promise.all([getHealthChecks(), getAudits()])

  const services = healthData.services || []
  const audits = auditsData.audits || []

  const healthyServices = services.filter((s: any) => s.status === 'healthy').length
  const completeAudits = audits.filter((a: any) => a.status === 'complete').length

  const { score, status } = calculateOverallHealth(services)

  const metricsData = {
    servicesHealthy: healthyServices,
    servicesTotal: services.length,
    auditsComplete: completeAudits,
    auditsTotal: audits.length,
    deploymentsActive: services.filter((s: any) => s.status === 'healthy').length,
    deploymentsTotal: services.length,
    avgResponseTime:
      services.length > 0
        ? Math.round(
            services.reduce((acc: number, s: any) => acc + (s.responseTime || 0), 0) /
              services.length
          )
        : 0,
  }

  const apiServices = services.filter((s: any) => s.type === 'api')
  const webServices = services.filter((s: any) => s.type === 'web')

  return (
    <>
      <Section size={'full'}>
        {/* Header */}
        <div className="space-y-2">
          <H1>System Monitoring Dashboard</H1>
          <P className="text-muted-foreground">
            Real-time monitoring of all services, audits, and deployments across the @ezstart
            monorepo
          </P>
        </div>

        {/* Overall Health Score */}
        <HealthScore score={score} status={status} />

        {/* Metrics Overview */}
        <MetricsOverview metrics={metricsData} />
      </Section>

      {/* Services & Audits Tabs */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="audits">Audits ({audits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-6 mt-6">
          {/* APIs */}
          <div className="space-y-4">
            <H2 size="h3">APIs ({apiServices.length})</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apiServices.map((service: any) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>

          {/* Web Apps */}
          <div className="space-y-4">
            <H2 size="h3">Web Applications ({webServices.length})</H2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {webServices.map((service: any) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>

          {services.length === 0 && (
            <div className="text-center py-12">
              <P className="text-muted-foreground">No services found</P>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audits" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audits.map((audit: any) => (
              <AuditCard key={audit.auditType} audit={audit} />
            ))}
          </div>

          {audits.length === 0 && (
            <div className="text-center py-12">
              <P className="text-muted-foreground">No audits found</P>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
