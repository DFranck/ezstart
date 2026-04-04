# Monitoring API

> Centralized monitoring and observability API for @ezstart monorepo

## 📚 Overview

This API provides comprehensive monitoring capabilities for the entire @ezstart ecosystem:

- **Health Checks** - Monitor all APIs and web apps
- **Audit Tracking** - Track audit results and scores
- **Deployment Monitoring** - Monitor Render, Railway and Vercel deployments
- **Metrics & Dashboard** - Aggregated metrics for dashboard
- **Git Tracking** - Monitor commits and repository health

## 🚀 Quick Start

```bash
# Development
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## 🔌 API Endpoints

### Health Checks

**Environment Behavior:**

- **Development**: Checks ONLY local URLs (doesn't consume production resources)
- **Production**: Checks ONLY production URLs

```bash
# Get all health checks
GET /api/health-checks
# Returns: { services: [...], environment: "development"|"production", summary: {...} }

# Get specific service health
GET /api/health-checks/:serviceId
# Returns: { serviceId, serviceName, environment, checks: [...] }

# Get service health history
GET /api/health-checks/:serviceId/history?limit=50
# Returns: { id, name, history: [...], uptime: { 24h, 7d, 30d } }
```

### Audits

```bash
# Get all audits
GET /api/audits

# Get specific audit
GET /api/audits/:type

# Example: GET /api/audits/security
```

### Deployments

```bash
# Get all deployments
GET /api/deployments

# Get specific deployment
GET /api/deployments/:id

# Example: GET /api/deployments/ezauth-api
```

### Metrics

```bash
# Get aggregated metrics
GET /api/metrics

# Get complete dashboard data
GET /api/metrics/dashboard
```

## ⚙️ Configuration

### Environment Variables

```env
NODE_ENV=development
PORT=6100
MONGO_URL=mongodb://localhost:27017/ezstart-monitoring

HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

### CORS

CORS is automatically configured via `@ezstart/config` to allow:

- All @ezstart web apps (local and production)
- Monitoring dashboard

## 📊 Example Response

### GET /api/metrics

```json
{
  "services": {
    "total": 13,
    "healthy": 11,
    "degraded": 1,
    "unhealthy": 1,
    "unknown": 0
  },
  "audits": {
    "total": 14,
    "complete": 5,
    "partial": 3,
    "notAudited": 6,
    "averageScore": 78,
    "overdue": 4
  },
  "deployments": {
    "total": 13,
    "active": 13,
    "deploying": 0,
    "failed": 0,
    "inactive": 0
  },
  "databases": {
    "total": 5,
    "connected": 5,
    "disconnected": 0,
    "averageResponseTime": 45
  },
  "git": {
    "uncommittedChanges": 2,
    "unpushedCommits": 3,
    "lastCommitAge": 5,
    "commitFrequency": "active"
  },
  "overallHealth": {
    "score": 87,
    "status": "good",
    "lastUpdated": "2025-10-17T10:30:00Z"
  }
}
```

## 🔗 Related Packages

- `@ezstart/monitoring` - Types and utilities
- `@ezstart/express-core` - Express infrastructure
- `@ezstart/config` - CORS and URL configuration

## 📝 Development

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Import and mount in `src/routes/index.ts`
3. Use types from `@ezstart/monitoring`

### Testing

```bash
# Test health check
curl http://localhost:6100/api/health

# Test metrics
curl http://localhost:6100/api/metrics

# Test specific service
curl http://localhost:6100/api/health-checks/ezauth-api
```

## 📄 License

MIT
