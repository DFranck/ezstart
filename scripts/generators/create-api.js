#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get project name from CLI arguments
const projectName = process.argv[2]

if (!projectName) {
  console.error('❌ Please provide a project name')
  console.log('Usage: node scripts/create-api.js <project-name>')
  process.exit(1)
}

const rootDir = process.cwd()
const projectPath = path.join(rootDir, 'apps', projectName, 'api')

// Port assignment system (50xx pattern)
// APIs: 50x0 pattern
const EXISTING_PORTS = {
  // APIs (50x0)
  'ezauth-api': 5010,
  'ezbill-api': 5020,
  // Web Apps (50x5)
  'ezauth-web': 5015,
  'ezbill-web': 5025,
  // Standalone Web Apps
  'ezstart-web': 5045,
  'asc-tcd-web': 5055,
  'fengshui-web': 5065,
}

// Find next available port for API
function getNextAvailablePort() {
  const apiPorts = Object.values(EXISTING_PORTS).filter(port =>
    port.toString().endsWith('0') // APIs end in 0
  ).sort((a, b) => a - b)

  const lastPort = apiPorts[apiPorts.length - 1] || 5000
  return lastPort + 10 // Increment by 10 to maintain xx0 pattern
}

const assignedPort = getNextAvailablePort()

// Check if project already exists
if (fs.existsSync(projectPath)) {
  console.error(`❌ Project ${projectName} already exists`)
  process.exit(1)
}

console.log(`🚀 Creating new API: ${projectName}`)

// Create project structure
fs.mkdirSync(projectPath, { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/routes'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/middleware'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/services'), { recursive: true })

// Package.json
const packageJson = {
  name: `api-${projectName}`,
  version: '0.1.0',
  private: true,
  scripts: {
    dev: 'tsx --watch src/server.ts',
    build: 'tsc',
    start: 'node dist/server.js',
    lint: 'eslint .',
    typecheck: 'tsc --noEmit'
  },
  dependencies: {
    '@ezstart/express-core': 'workspace:*',
    '@ezstart/types': 'workspace:*',
    'cors': '^2.8.5',
    'dotenv': '^16.4.7',
    'express': '^4.21.4',
    'mongoose': '^8.10.4',
    'zod': '^3.24.1'
  },
  devDependencies: {
    '@ezstart/eslint-config': 'workspace:*',
    '@ezstart/typescript-config': 'workspace:*',
    '@types/cors': '^2.8.18',
    '@types/express': '^5.0.2',
    '@types/node': '^22.10.6',
    'eslint': '^9.18.0',
    'tsx': '^4.19.2',
    'typescript': '^5.7.3'
  }
}

fs.writeFileSync(
  path.join(projectPath, 'package.json'),
  JSON.stringify(packageJson, null, 2)
)

// TypeScript config
const tsConfig = {
  extends: '@ezstart/typescript-config/api.json',
  compilerOptions: {
    composite: true,
    outDir: 'dist',
    rootDir: 'src'
  },
  include: ['src/**/*'],
  exclude: ['node_modules', 'dist']
}

fs.writeFileSync(
  path.join(projectPath, 'tsconfig.json'),
  JSON.stringify(tsConfig, null, 2)
)

// ESLint config
const eslintConfig = `import eslintConfig from '@ezstart/eslint-config/base'

export default [...eslintConfig]
`

fs.writeFileSync(
  path.join(projectPath, 'eslint.config.js'),
  eslintConfig
)

// .env.example
const envExample = `# Server
NODE_ENV=development
PORT=${assignedPort}

# Database
MONGODB_URI=mongodb://localhost:27017/${projectName}

# CORS
CORS_ORIGIN=http://localhost:${assignedPort + 5}
`

fs.writeFileSync(
  path.join(projectPath, '.env.example'),
  envExample
)

// .env.local
fs.writeFileSync(
  path.join(projectPath, '.env.local'),
  envExample // Same content for local dev
)

// Server.ts
const serverContent = `import {
  createApp,
  connectToMongo,
  startServer,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const PORT = process.env.PORT || ${assignedPort}
const app = createApp()

// OpenAPI setup
const registry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(registry, router)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: '${projectName}' }))

// Sample route
router.get('/', (_, res) => {
  res.json({ message: 'Welcome to ${projectName} API' })
})

// Mount routes
app.use('/api', docRouter)

// Start server
connectToMongo('${projectName}')
  .then(() =>
    startServer(app, {
      routes: router,
      registries: [registry],
      serviceName: '${projectName.charAt(0).toUpperCase() + projectName.slice(1)} API',
      port: Number(PORT),
    })
  )
  .catch((err) => {
    console.error('❌ Failed to start API:', err)
    process.exit(1)
  })
`

fs.writeFileSync(
  path.join(projectPath, 'src/server.ts'),
  serverContent
)

// Add to root package.json scripts
const rootPackageJsonPath = path.join(rootDir, 'package.json')
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'))

// Add new api to turbo filter scripts if needed
if (!rootPackageJson.scripts[`dev:${projectName}`]) {
  rootPackageJson.scripts[`dev:${projectName}`] = `turbo dev --filter=api-${projectName} --filter=web-${projectName}`
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2))
}

console.log('✅ Project structure created')
console.log('📦 Installing dependencies...')

// Install dependencies
execSync('pnpm install', { stdio: 'inherit', cwd: rootDir })

console.log('\n✨ API created successfully!')
console.log('\n📝 Configuration:')
console.log(`  • Port assigned: ${assignedPort}`)
console.log(`  • API URL: http://localhost:${assignedPort}/api`)
console.log('\n📋 Next steps:')
console.log(`  1. Add to CLAUDE.md ports table:`)
console.log(`     | ${projectName.charAt(0).toUpperCase() + projectName.slice(1)} | API | ${assignedPort} | http://localhost:${assignedPort} | ✅ Running |`)
console.log(`  2. Run: pnpm dev:${projectName}`)
console.log(`  3. Test: http://localhost:${assignedPort}/api/health`)
console.log('\n🎉 Happy coding!')