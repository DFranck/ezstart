# @ezstart/monitoring

> Centralized monitoring, auditing, and observability system for @ezstart monorepo

## 📚 Overview

This package provides a **single source of truth** for all monitoring, health checks, audits, and observability in the @ezstart monorepo. It's designed to be used by the monitoring dashboard in EZStart and by any service that needs to report or check health.

## 🎯 Features

- **🔍 Health Checks** - Monitor APIs, web apps, databases, and external services
- **📊 Audit Tracking** - Track and manage all audits (security, performance, etc.)
- **🚀 Deployment Monitoring** - Monitor Railway and Vercel deployments
- **💾 Database Health** - Check MongoDB/Postgres/Redis connections and performance
- **🔄 Git Tracking** - Monitor commits, branches, and repository health
- **📈 Metrics & Dashboard** - Aggregate metrics for comprehensive monitoring
- **⚡ Type-Safe** - Full TypeScript support with Zod schemas

## 📦 Installation

```bash
# In a workspace package
pnpm add @ezstart/monitoring
```

## 🚀 Quick Start

### Health Checks

```typescript
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'

const checker = new HealthChecker()

// Check a single service
const result = await checker.check({
  name: 'EZAuth API',
  type: 'api',
  url: 'http://localhost:5010/api/health',
  timeout: 5000,
  interval: 30000,
  retries: 3,
})

console.log(result.status) // 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
console.log(result.responseTime) // 150ms

// Check with retries
const resultWithRetries = await checker.checkWithRetries(config)

// Get uptime percentage
const uptime = checker.calculateUptime('EZAuth API', 24) // last 24 hours
console.log(uptime) // 99.95%

// Get average response time
const avgResponseTime = checker.getAverageResponseTime('EZAuth API', 10)
console.log(avgResponseTime) // 150ms
```

### Monitored Services

All services are pre-configured in `MONITORED_SERVICES`:

```typescript
import { MONITORED_SERVICES } from '@ezstart/monitoring'

// Access service configurations
const ezauthApi = MONITORED_SERVICES['ezauth-api']
console.log(ezauthApi.localUrl) // http://localhost:5010/api/health
console.log(ezauthApi.productionUrl) // https://ezauth-api.up.railway.app/api/health
```

Available services:
- **APIs**: `ezauth-api`, `ezpay-api`, `ezbill-api`, `green-pulse-api`
- **Web Apps**: `ezstart-web`, `ezauth-web`, `ezbill-web`, `ezpay-web`, `fengshui-web`, `asc-tcd-web`, `green-pulse-web`

### Audit Tracking

```typescript
import { AUDIT_METADATA, AuditResult } from '@ezstart/monitoring'

// Get audit metadata
const securityAudit = AUDIT_METADATA.security
console.log(securityAudit.frequency) // 'weekly'
console.log(securityAudit.estimatedDuration) // 60 minutes

// Track audit results
const auditResult: AuditResult = {
  type: 'security',
  status: 'complete',
  score: 85,
  lastUpdated: new Date(),
  nextDue: new Date('2025-10-23'),
  duration: 55,
  executor: 'Claude',
}
```

### Scoring Utilities

```typescript
import {
  calculateOverallHealthScore,
  getScoreEmoji,
  getScoreStatusText,
  isAuditOverdue
} from '@ezstart/monitoring'

// Calculate overall health
const score = calculateOverallHealthScore({
  servicesHealthy: 10,
  servicesTotal: 12,
  auditsComplete: 8,
  auditsTotal: 14,
  deploymentsActive: 13,
  deploymentsTotal: 13,
  databasesConnected: 5,
  databasesTotal: 5,
})
console.log(score) // 87

// Score utilities
console.log(getScoreEmoji(87)) // 🟡
console.log(getScoreStatusText(87)) // 'Good'

// Check if audit is overdue
const overdue = isAuditOverdue(new Date('2025-10-01'), 'weekly')
console.log(overdue) // true
```

### Formatters

```typescript
import {
  formatBytes,
  formatDuration,
  formatRelativeTime,
  formatUptime,
  formatCost,
} from '@ezstart/monitoring'

console.log(formatBytes(1536000)) // '1.46 MB'
console.log(formatDuration(5432)) // '5.4s'
console.log(formatRelativeTime(new Date('2025-10-15'))) // '2d ago'
console.log(formatUptime(99.95)) // '99.95%'
console.log(formatCost(1.25)) // '$1.25'
```

## 📊 Types

### Health Check Types

- `HealthCheckConfig` - Configuration for health checks
- `HealthCheckResult` - Result of a health check
- `ServiceHealth` - Aggregated health data for a service
- `HealthStatus` - `'healthy' | 'degraded' | 'unhealthy' | 'unknown'`

### Audit Types

- `AuditType` - Type of audit (security, performance, etc.)
- `AuditStatus` - `'not-audited' | 'in-progress' | 'partial' | 'complete'`
- `AuditResult` - Result of an audit
- `AuditIssue` - Issue found during audit
- `AuditReport` - Complete audit report

### Deployment Types

- `DeploymentConfig` - Configuration for deployment monitoring
- `DeploymentInfo` - Current deployment information
- `InfrastructureCost` - Cost tracking for infrastructure

### Database Types

- `DatabaseConfig` - Database connection configuration
- `DatabaseHealth` - Database health status
- `DatabaseStats` - Database statistics (collections, size, etc.)

### Metrics Types

- `MonitoringMetrics` - Aggregated metrics for dashboard
- `MonitoringDashboard` - Complete dashboard data
- `MonitoringIssue` - Issues detected by monitoring
- `ContinuousImprovement` - Continuous improvement tracking

## 🔧 Configuration

### Environment Detection

The package automatically detects the environment and uses the appropriate URLs:

```typescript
// In local development
MONITORED_SERVICES['ezauth-api'].localUrl // Used

// In production
MONITORED_SERVICES['ezauth-api'].productionUrl // Used
```

### Custom Health Checks

```typescript
const checker = new HealthChecker()

// Custom configuration
const customCheck = await checker.check({
  name: 'Custom Service',
  type: 'external',
  url: 'https://api.example.com/health',
  timeout: 10000,
  interval: 60000,
  retries: 5,
  expectedStatus: 200,
  headers: {
    'Authorization': 'Bearer token',
  },
})
```

## 🎨 UI Integration

### Health Status Colors

```typescript
import { getHealthStatusColor, getScoreColor } from '@ezstart/monitoring'

// Tailwind classes for health status
const healthColor = getHealthStatusColor('healthy')
// 'text-green-600 dark:text-green-400'

// Tailwind classes for scores
const scoreColor = getScoreColor(85)
// 'text-yellow-600 dark:text-yellow-400'
```

### Priority Badges

```typescript
import { getPriorityColor } from '@ezstart/monitoring'

const priorityColor = getPriorityColor('critical')
// 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
```

## 📈 Usage Examples

### Complete Monitoring Dashboard

```typescript
import {
  HealthChecker,
  MONITORED_SERVICES,
  AUDIT_METADATA,
  calculateOverallHealthScore,
  type MonitoringDashboard,
} from '@ezstart/monitoring'

async function getDashboardData(): Promise<MonitoringDashboard> {
  const checker = new HealthChecker()

  // Check all services
  const servicePromises = Object.entries(MONITORED_SERVICES).map(
    ([id, config]) => checker.checkWithRetries({
      name: config.name,
      type: config.type,
      url: config.localUrl, // or productionUrl
      timeout: 5000,
      interval: 30000,
      retries: 3,
    })
  )

  const serviceResults = await Promise.all(servicePromises)

  // Calculate metrics
  const servicesHealthy = serviceResults.filter(r => r.status === 'healthy').length
  const servicesTotal = serviceResults.length

  const overallScore = calculateOverallHealthScore({
    servicesHealthy,
    servicesTotal,
    auditsComplete: 8,
    auditsTotal: 14,
    deploymentsActive: 13,
    deploymentsTotal: 13,
    databasesConnected: 5,
    databasesTotal: 5,
  })

  return {
    metrics: {
      services: {
        total: servicesTotal,
        healthy: servicesHealthy,
        degraded: serviceResults.filter(r => r.status === 'degraded').length,
        unhealthy: serviceResults.filter(r => r.status === 'unhealthy').length,
        unknown: serviceResults.filter(r => r.status === 'unknown').length,
      },
      // ... more metrics
      overallHealth: {
        score: overallScore,
        status: overallScore >= 90 ? 'excellent' : overallScore >= 70 ? 'good' : overallScore >= 50 ? 'fair' : 'poor',
        lastUpdated: new Date(),
      },
    },
    // ... more dashboard data
  }
}
```

## 🔗 Related Packages

- `@ezstart/config` - Centralized URLs and CORS configuration
- `@ezstart/express-core` - Express utilities with health check endpoints
- `@ezstart/ui` - UI components for displaying monitoring data

## 📝 Best Practices

1. **Regular Health Checks** - Run health checks every 30-60 seconds
2. **Retry Logic** - Always use `checkWithRetries()` for critical services
3. **History Management** - Monitor keeps last 100 checks, adjust if needed
4. **Timeouts** - Set appropriate timeouts (5s for APIs, 10s for external)
5. **Error Handling** - Always handle health check errors gracefully

## 🤝 Contributing

When adding new services or audit types:

1. Update the types in `src/types/`
2. Add configurations to constants (e.g., `MONITORED_SERVICES`)
3. Update this README
4. Update the monitoring dashboard in EZStart

## 📚 Documentation

- [AUDIT-GUIDE.md](../../docs/AUDIT-GUIDE.md) - Complete audit guide
- [CLAUDE.md](../../CLAUDE.md) - Monorepo configuration
- [docs/audits/](../../docs/audits/) - Audit templates

## 📄 License

MIT

---

**Built with ❤️ for the @ezstart monorepo**
