// scripts/generate-config.ts
import fs from 'fs'
import path from 'path'
import { DEFAULT_IGNORE_DIRS, findPackages } from './utils/findPackages'

const OUTPUT_FILE = path.join(process.cwd(), 'monorepo-config.md')

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch (err) {
    return null
  }
}

function formatJson(title: string, json: any) {
  return `### ${title}\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`
}

function getRelativePath(file: string) {
  return path.relative(process.cwd(), file).replace(/\\/g, '/')
}

function getProjectType(pkgJson: any, pkgPath: string): string {
  if (pkgJson?.name?.startsWith('api-')) return 'API'
  if (pkgJson?.name?.startsWith('web-')) return 'Web App'
  if (pkgJson?.name?.startsWith('pwa-')) return 'PWA'
  if (pkgJson?.name?.startsWith('@ezstart/')) return 'Package'
  if (pkgJson?.name?.startsWith('@tower-defense/')) return 'Tower Defense Package'
  if (pkgJson?.name?.startsWith('@workspace/')) return 'Workspace Package'

  // Check for Next.js
  if (pkgJson?.dependencies?.next) return 'Next.js App'
  if (pkgJson?.devDependencies?.next) return 'Next.js App'

  // Check for React
  if (pkgJson?.dependencies?.react) return 'React App'
  if (pkgJson?.devDependencies?.react) return 'React App'

  // Check for Express
  if (pkgJson?.dependencies?.express) return 'Express API'
  if (pkgJson?.devDependencies?.express) return 'Express API'

  return 'Unknown'
}

function getRecommendedTsConfig(projectType: string): string {
  switch (projectType) {
    case 'API':
    case 'Express API':
      return '@workspace/typescript-config/api.json'
    case 'Web App':
    case 'Next.js App':
      return '@workspace/typescript-config/nextjs.json'
    case 'PWA':
      return '@workspace/typescript-config/nextjs.json'
    case 'Package':
    case 'Tower Defense Package':
    case 'Workspace Package':
      return '@workspace/typescript-config/package.json'
    case 'React App':
      return '@workspace/typescript-config/react-library.json'
    default:
      return '@workspace/typescript-config/base.json'
  }
}

function getRecommendedPackageJson(projectType: string): any {
  const base = {
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      typecheck: 'tsc --noEmit',
      lint: 'eslint . --ext .ts,.tsx',
    },
    devDependencies: {
      '@workspace/eslint-config': 'workspace:*',
      '@workspace/typescript-config': 'workspace:*',
      typescript: '^5.7.3',
    },
  }

  switch (projectType) {
    case 'API':
    case 'Express API':
      return {
        ...base,
        scripts: {
          dev: 'tsx watch server.ts',
          build: 'tsc',
          start: 'node dist/server.js',
          typecheck: 'tsc --noEmit',
          lint: 'eslint . --ext .ts,.tsx',
        },
        dependencies: {
          '@ezstart/api-core': 'workspace:*',
          '@ezstart/types': 'workspace:*',
          express: '^4.19.2',
          cors: '^2.8.5',
          dotenv: '^16.5.0',
        },
      }
    case 'Next.js App':
      return {
        ...base,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint',
        },
        dependencies: {
          next: '^15.4.5',
          react: '^19.1.0',
          'react-dom': '^19.1.0',
        },
      }
    case 'Package':
      return {
        ...base,
        main: 'src/index.ts',
        types: 'src/index.ts',
        exports: {
          '.': {
            import: './src/index.ts',
            types: './src/index.ts',
          },
        },
      }
    default:
      return base
  }
}

async function generateConfig() {
  const allPackages = findPackages(process.cwd(), {
    ignoreDirs: DEFAULT_IGNORE_DIRS,
  })

  const markdown: string[] = [
    '# 🏗️ Monorepo Configuration Overview\n',
    '## 📋 Summary\n',
    'This document contains all configuration files for the monorepo packages.\n',
  ]

  // Group packages by type
  const packagesByType: Record<string, string[]> = {}

  for (const pkgPath of allPackages) {
    const pkgJson = readJson(path.join(pkgPath, 'package.json'))
    if (!pkgJson?.name) continue

    const projectType = getProjectType(pkgJson, pkgPath)
    if (!packagesByType[projectType]) {
      packagesByType[projectType] = []
    }
    packagesByType[projectType].push(pkgPath)
  }

  // Generate sections for each type
  for (const [projectType, packages] of Object.entries(packagesByType)) {
    markdown.push(`\n## ${projectType}s (${packages.length})\n`)
    markdown.push(`**Recommended tsconfig:** \`${getRecommendedTsConfig(projectType)}\`\n`)

    for (const pkgPath of packages) {
      const pkgJsonPath = path.join(pkgPath, 'package.json')
      const tsconfigPath = path.join(pkgPath, 'tsconfig.json')
      const turboJsonPath = path.join(pkgPath, 'turbo.json')

      const pkgJson = readJson(pkgJsonPath)
      const tsconfig = readJson(tsconfigPath)
      const turboJson = readJson(turboJsonPath)

      markdown.push(`### 🗂️ \`${pkgJson?.name}\``)
      markdown.push(`📁 Path: \`${getRelativePath(pkgPath)}\`\n`)

      if (pkgJson) markdown.push(formatJson('package.json', pkgJson))
      if (tsconfig) markdown.push(formatJson('tsconfig.json', tsconfig))
      if (turboJson) markdown.push(formatJson('turbo.json', turboJson))

      // Add recommendations
      markdown.push('#### 💡 Recommendations\n')
      const recommendedTsConfig = getRecommendedTsConfig(projectType)
      const recommendedPackageJson = getRecommendedPackageJson(projectType)

      markdown.push(`**Recommended tsconfig.json:**\n`)
      markdown.push(`\`\`\`json\n{\n  "extends": "${recommendedTsConfig}"\n}\n\`\`\`\n`)

      markdown.push(`**Recommended package.json structure:**\n`)
      markdown.push(`\`\`\`json\n${JSON.stringify(recommendedPackageJson, null, 2)}\n\`\`\`\n`)
    }
  }

  // Add workspace configurations
  markdown.push('\n## ⚙️ Workspace Configurations\n')

  // TypeScript configs
  const tsConfigPath = path.resolve('packages', 'typescript-config')
  if (fs.existsSync(tsConfigPath)) {
    markdown.push('### 📝 TypeScript Configurations\n')
    const jsonFiles = fs.readdirSync(tsConfigPath).filter(f => f.endsWith('.json'))

    for (const file of jsonFiles) {
      const filePath = path.join(tsConfigPath, file)
      const content = readJson(filePath)
      if (content) markdown.push(formatJson(file, content))
    }
  }

  // Root configurations
  const rootPath = process.cwd()
  const rootPackageJson = readJson(path.join(rootPath, 'package.json'))
  const rootTsconfig = readJson(path.join(rootPath, 'tsconfig.json'))
  const pnpmWorkspace = readJson(path.join(rootPath, 'pnpm-workspace.yaml'))

  if (rootPackageJson || rootTsconfig || pnpmWorkspace) {
    markdown.push('\n### 🏠 Root Configurations\n')

    if (rootPackageJson) markdown.push(formatJson('package.json', rootPackageJson))
    if (rootTsconfig) markdown.push(formatJson('tsconfig.json', rootTsconfig))
    if (pnpmWorkspace) markdown.push(formatJson('pnpm-workspace.yaml', pnpmWorkspace))
  }

  // Add usage guide
  markdown.push('\n## 🚀 Quick Start Guide\n')
  markdown.push(`
### Creating a new API project:
\`\`\`bash
mkdir apps/my-api
cd apps/my-api
\`\`\`

**package.json:**
\`\`\`json
{
  "name": "api-my-api",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
\`\`\`

**tsconfig.json:**
\`\`\`json
{
  "extends": "@workspace/typescript-config/api.json"
}
\`\`\`

### Creating a new Next.js app:
\`\`\`bash
mkdir apps/my-web
cd apps/my-web
\`\`\`

**package.json:**
\`\`\`json
{
  "name": "web-my-web",
  "version": "0.0.1",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.4.5",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
\`\`\`

**tsconfig.json:**
\`\`\`json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
\`\`\`

### Creating a new package:
\`\`\`bash
mkdir packages/my-package
cd packages/my-package
\`\`\`

**package.json:**
\`\`\`json
{
  "name": "@ezstart/my-package",
  "version": "0.0.1",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "dev": "tsc -b --watch",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
\`\`\`

**tsconfig.json:**
\`\`\`json
{
  "extends": "@workspace/typescript-config/package.json"
}
\`\`\`
`)

  fs.writeFileSync(OUTPUT_FILE, markdown.join('\n'), 'utf-8')
  console.log(`✅ monorepo-config.md generated at ${OUTPUT_FILE}`)
}

generateConfig().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
