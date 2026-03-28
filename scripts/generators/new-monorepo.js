#!/usr/bin/env node

/**
 * new-monorepo.js - Generate a new monorepo from scratch
 *
 * Usage:
 *   node scripts/generators/new-monorepo.js --name my-project --output ../my-project --include-example
 *
 * Arguments:
 *   --name       (required) Project name in kebab-case (used as @name/ scope)
 *   --output     (required) Output directory path
 *   --include-example       Include an example-app (web + api + types)
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..', '..')

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { name: null, output: null, includeExample: false }
  let i = 2
  while (i < argv.length) {
    switch (argv[i]) {
      case '--name':
        args.name = argv[++i]
        break
      case '--output':
        args.output = argv[++i]
        break
      case '--include-example':
        args.includeExample = true
        break
      default:
        console.error(`Unknown argument: ${argv[i]}`)
        process.exit(1)
    }
    i++
  }
  if (!args.name) {
    console.error('Missing required argument: --name')
    process.exit(1)
  }
  if (!args.output) {
    console.error('Missing required argument: --output')
    process.exit(1)
  }
  return args
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFile(filePath, content) {
  mkdirp(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
  console.log(`  created ${path.relative(process.cwd(), filePath)}`)
}

function copyDirRecursive(src, dest, transformFn) {
  mkdirp(dest)
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.turbo') continue
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, transformFn)
    } else {
      let content = fs.readFileSync(srcPath, 'utf8')
      if (transformFn) content = transformFn(content, entry.name)
      writeFile(destPath, content)
    }
  }
}

function toPascalCase(str) {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

// ---------------------------------------------------------------------------
// File generators
// ---------------------------------------------------------------------------

function genRootPackageJson(name) {
  return JSON.stringify(
    {
      name: name,
      description: `Monorepo for ${name}`,
      version: '0.0.1',
      private: true,
      scripts: {
        build: 'turbo build',
        dev: 'turbo run dev --concurrency 50',
        'dev:types': 'tsc -b --watch',
        lint: 'turbo run lint',
        typecheck: 'turbo run typecheck',
        prepare: 'husky',
      },
      'lint-staged': {
        '*.{ts,tsx}': ['prettier --write'],
        '*.{js,jsx}': ['prettier --write'],
        '*.{json,md,css}': ['prettier --write'],
      },
      devDependencies: {
        [`@${name}/eslint-config`]: 'workspace:*',
        [`@${name}/typescript-config`]: 'workspace:*',
        eslint: '^9.27.0',
        husky: '^9.1.7',
        'lint-staged': '^16.4.0',
        prettier: '^3.5.1',
        rimraf: '^6.1.2',
        tsx: '^4.20.3',
        turbo: '^2.4.2',
        typescript: '5.7.3',
      },
      packageManager: 'pnpm@10.12.2',
      engines: {
        node: '20.18.x',
        pnpm: '10.12.x',
      },
    },
    null,
    2
  )
}

function genTurboJson() {
  return JSON.stringify(
    {
      $schema: 'https://turbo.build/schema.json',
      ui: 'stream',
      tasks: {
        build: {
          dependsOn: ['^build'],
          inputs: ['$TURBO_DEFAULT$', '.env*'],
          outputs: ['.next/**', '!.next/cache/**', '**/dist/**'],
        },
        lint: {
          dependsOn: ['^lint'],
        },
        typecheck: {
          dependsOn: ['^typecheck'],
        },
        dev: {
          cache: false,
          persistent: true,
          interruptible: true,
        },
      },
    },
    null,
    2
  )
}

function genPnpmWorkspace() {
  return `packages:
  - apps/*
  - apps/*/*
  - packages/*
`
}

function genRootTsconfig(name) {
  const config = {
    $schema: 'https://json.schemastore.org/tsconfig',
    extends: `@${name}/typescript-config/base.json`,
    compilerOptions: {
      composite: true,
      declaration: true,
      noEmit: true,
    },
    files: [],
    references: [],
  }
  return JSON.stringify(config, null, 2)
}

function genPrettierConfig() {
  return `/** @type {import("prettier").Config} */
module.exports = {
  semi: false,
  singleQuote: true,
  trailingComma: "es5",
  arrowParens: "avoid",
  endOfLine: "auto",
  printWidth: 100,
  tabWidth: 2,
}
`
}

function genGitignore() {
  return `# Dependencies
node_modules
.pnp
.pnp.js

# Local env files
.env
.env.local
.env.*.local
.env.production
!.env.example

# Testing
coverage

# Turbo
.turbo

# Vercel
.vercel

# Build Outputs
.next/
out/
build
dist

# Debug
npm-debug.log*

# Misc
.DS_Store
*.pem

# TypeScript build info
*.tsbuildinfo
next-env.d.ts

# Claude settings (local only)
.claude/settings.local.json
.claude/**/local/**
.claude/**/*.local.*
`
}

function genHuskyPreCommit() {
  return `npx lint-staged
`
}

function genReadme(name) {
  const pascal = toPascalCase(name)
  return `# ${pascal}

Monorepo powered by [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/).

## Quick Start

\`\`\`bash
pnpm install

# Run all apps in dev mode
pnpm dev

# Type watching (run in a separate terminal if needed)
pnpm dev:types

# Build everything
pnpm build

# Lint / Typecheck
pnpm lint
pnpm typecheck
\`\`\`

## Architecture

\`\`\`
${name}/
├── packages/
│   ├── typescript-config/   # Shared TS configs
│   ├── eslint-config/       # Shared ESLint configs
│   └── tailwind-config/     # Shared Tailwind preset
├── apps/                    # Applications
├── turbo.json               # Turborepo pipeline
├── pnpm-workspace.yaml      # Workspace definition
└── package.json             # Root scripts & deps
\`\`\`

## Packages

| Package | Description |
|---------|-------------|
| \`@${name}/typescript-config\` | Shared TypeScript configurations (base, api, nextjs, library, react-library, types) |
| \`@${name}/eslint-config\` | Shared ESLint configurations (base, next-js, react-internal) |
| \`@${name}/tailwind-config\` | Shared Tailwind CSS preset |

## Adding a New App

Create a new directory under \`apps/\`, add a \`package.json\` with the proper name, and reference the shared configs.

## Conventions

- **Commits**: \`type: description\` (feat, fix, docs, refactor, test, chore)
- **Naming**: PascalCase components, camelCase functions/variables, kebab-case folders
- **Env files**: \`.env.example\` committed, \`.env.local\` gitignored
`
}

function genBacklog(name) {
  const pascal = toPascalCase(name)
  return `# Backlog - ${pascal}

**Source de verite pour les projets en cours.**

Usage: "continue [nom-du-projet]" pour reprendre.

---

## Applications

| App | Status | Notes |
|-----|--------|-------|
| (none yet) | - | - |

---

## Monorepo / Infra

| Task | Status | Notes |
|------|--------|-------|
| Initial setup | done | Monorepo scaffolded |

---
`
}

function genDevRules(name) {
  return `# Development Rules - ${toPascalCase(name)} Monorepo

**Mandatory rules for all developers working on this monorepo.**

---

## Principle: Maximum Reusability

- Maximize shared code, minimize duplication, create agnostic components.
- Packages in \`/packages/\` MUST be 100% agnostic - no project-specific logic.

### Package Hierarchy (strict order)

1. Check if it already exists in \`packages/\`
2. Check if it can be generalized for \`packages/\` (used by 2+ projects = MUST be a package)
3. If project-specific: check if shareable between web/api (\`apps/[project]/types\`)
4. Last resort: create in the specific layer (\`apps/[project]/web/\` or \`apps/[project]/api/\`)

---

## TypeScript

### Centralized Compilation

- \`tsc -b --watch\` at root only - one TS process for the whole monorepo
- \`composite: true\` in ALL tsconfig files
- References towards dependent packages
- NEVER run \`tsc --watch\` inside individual packages

### Configs

Always use \`@${name}/typescript-config\`:

| Variant | Usage |
|---------|-------|
| \`base.json\` | Base config (simple packages) |
| \`api.json\` | API (Express/Node) |
| \`nextjs.json\` | Next.js apps |
| \`library.json\` | Generic library |
| \`react-library.json\` | React library |
| \`types.json\` | Type definitions only |

### Target: ES2022 for everything (Node.js LTS 20.18.x)

---

## UI/UX

### Semantic Colors Only

\`\`\`tsx
// BAD - hardcoded colors
className="bg-gray-100 text-gray-900"

// GOOD - semantic classes
className="bg-card text-foreground border"
\`\`\`

### Use Component Variants

\`\`\`tsx
<Button variant="destructive" size="sm" />
<Card variant="floating" />
\`\`\`

---

## API Standards

### Action-Based Routing

\`\`\`
src/routes/
├── {feature}/
│   ├── create{Entity}.ts
│   ├── list{Entities}.ts
│   ├── get{Entity}ById.ts
│   ├── update{Entity}.ts
│   ├── delete{Entity}.ts
│   └── index.ts
└── index.ts
\`\`\`

### All routes prefixed with \`/api\`

### Pagination mandatory on all list endpoints

- \`limit\` (default 20) + \`offset\`
- Response: \`{ data, meta: { total, limit, offset } }\`

---

## Data Fetching (Frontend)

- Use React Query (TanStack Query) for data-heavy apps
- Consistent queryKeys: \`['entity']\` for lists, \`['entity', id]\` for single items
- \`enabled\` flag for conditional queries

---

## Configuration

### Centralized Configs

| Package | Usage |
|---------|-------|
| \`@${name}/typescript-config\` | TypeScript (6 variants) |
| \`@${name}/eslint-config\` | ESLint (3 variants) |
| \`@${name}/tailwind-config\` | Tailwind CSS |

### Never create local configs unless truly project-specific

---

## Environments & Secrets

### 3 env files per project:

\`\`\`
.env.example    # Template (committed)
.env.local      # Dev local (gitignored)
.env.production # Production (gitignored)
\`\`\`

### NEVER commit secrets (API keys, tokens, passwords, .env files)

---

## Git & Documentation

### Commit Convention

\`\`\`
type: brief description

- Detailed changes
\`\`\`

Types: \`feat\`, \`fix\`, \`docs\`, \`refactor\`, \`perf\`, \`test\`, \`chore\`, \`ci\`, \`build\`

### Pre-commit Validation

- \`pnpm typecheck\` MUST pass before any commit
- No secrets in staged files

### README mandatory for all packages

---

## Scripts Organization

\`\`\`
scripts/
├── generators/   # Code/project generators (reusable)
├── tools/        # Dev utilities (reusable)
└── monitoring/   # Health checks & audits
\`\`\`

- NEVER leave scripts at the monorepo root
- NEVER commit temporary/one-shot scripts

---

## Testing

\`\`\`bash
pnpm typecheck    # Full typecheck
pnpm lint         # Full lint
pnpm build        # Full build
\`\`\`

### Before each commit:
- TypeCheck without errors
- Lint warnings acceptable (no blockers)
- Build succeeds for modified packages

### Before each push:
- All packages build
- Documentation up to date
- Tests pass (if applicable)

---

## Checklist: New Package

- [ ] Check if it can be added to an existing package
- [ ] Create standard structure (src/, dist/, package.json, tsconfig.json)
- [ ] Use centralized config (\`@${name}/typescript-config\`)
- [ ] Create README.md with examples
- [ ] Add clean exports in src/index.ts
- [ ] Build and verify TypeCheck
- [ ] Test import in an app

## Checklist: New App

- [ ] Structure: web/, api/, types/
- [ ] Use centralized configs (tailwind, eslint, tsconfig)
- [ ] Create .env.example with all variables
- [ ] Add standard scripts (dev, build, lint, typecheck)
- [ ] Test local build
`
}

// ---------------------------------------------------------------------------
// Typescript-config package (cleaned, re-scoped)
// ---------------------------------------------------------------------------

function genTypescriptConfigPackageJson(name) {
  return JSON.stringify(
    {
      name: `@${name}/typescript-config`,
      version: '0.0.1',
      private: true,
      exports: {
        './base.json': './src/base.json',
        './api.json': './src/api.json',
        './nextjs.json': './src/nextjs.json',
        './library.json': './src/library.json',
        './react-library.json': './src/react-library.json',
        './types.json': './src/types.json',
        './package.json': './src/package.json',
      },
    },
    null,
    2
  )
}

// ---------------------------------------------------------------------------
// Eslint-config package (cleaned, re-scoped)
// ---------------------------------------------------------------------------

function genEslintConfigPackageJson(name) {
  return JSON.stringify(
    {
      name: `@${name}/eslint-config`,
      version: '0.0.0',
      type: 'module',
      private: true,
      exports: {
        './base': './src/base.js',
        './next-js': './src/next.js',
        './react-internal': './src/react-internal.js',
      },
      devDependencies: {
        '@next/eslint-plugin-next': '^15.1.7',
        '@typescript-eslint/eslint-plugin': '^8.24.1',
        '@typescript-eslint/parser': '^8.24.1',
        eslint: '^9.27.0',
        'eslint-config-prettier': '^9.1.0',
        'eslint-plugin-only-warn': '^1.1.0',
        'eslint-plugin-react': '^7.37.4',
        'eslint-plugin-react-hooks': '^5.1.0',
        'eslint-plugin-turbo': '^2.4.2',
        globals: '^15.15.0',
        typescript: '^5.7.3',
        'typescript-eslint': '^8.24.1',
      },
    },
    null,
    2
  )
}

// ---------------------------------------------------------------------------
// Tailwind-config package (cleaned, re-scoped)
// ---------------------------------------------------------------------------

function genTailwindConfigPackageJson(name) {
  return JSON.stringify(
    {
      name: `@${name}/tailwind-config`,
      version: '0.0.1',
      description: `Shared Tailwind CSS configuration for @${name} monorepo`,
      main: './src/base.js',
      type: 'module',
      exports: {
        '.': './src/base.js',
        './base': './src/base.js',
        './base.js': './src/base.js',
      },
      files: ['src/base.js'],
      peerDependencies: {
        tailwindcss: '^3.0.0 || ^4.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.1.11',
        [`@${name}/typescript-config`]: 'workspace:*',
        typescript: '^5.7.3',
      },
    },
    null,
    2
  )
}

function genTailwindBase() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`
}

// ---------------------------------------------------------------------------
// Example app generators
// ---------------------------------------------------------------------------

function genExampleAppTypes(name) {
  const pkg = JSON.stringify(
    {
      name: `@${name}/example-types`,
      version: '0.0.1',
      private: true,
      main: './dist/index.js',
      types: './dist/index.d.ts',
      scripts: {
        build: 'tsc',
        typecheck: 'tsc --noEmit',
      },
      devDependencies: {
        [`@${name}/typescript-config`]: 'workspace:*',
        typescript: '^5.7.3',
      },
    },
    null,
    2
  )
  const tsconfig = JSON.stringify(
    {
      extends: `@${name}/typescript-config/types.json`,
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  )
  const index = `export interface ExampleItem {
  id: string
  title: string
  createdAt: string
}
`
  return { pkg, tsconfig, index }
}

function genExampleAppApi(name) {
  const pkg = JSON.stringify(
    {
      name: `@${name}/example-api`,
      version: '0.0.1',
      private: true,
      main: 'dist/index.js',
      scripts: {
        dev: 'tsx watch src/index.ts',
        build: 'tsc',
        start: 'node dist/index.js',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        cors: '^2.8.5',
        dotenv: '^16.4.7',
        express: '^4.21.2',
      },
      devDependencies: {
        [`@${name}/typescript-config`]: 'workspace:*',
        [`@${name}/example-types`]: 'workspace:*',
        '@types/cors': '^2.8.17',
        '@types/express': '^5.0.0',
        '@types/node': '^22.13.4',
        tsx: '^4.20.3',
        typescript: '^5.7.3',
      },
    },
    null,
    2
  )
  const tsconfig = JSON.stringify(
    {
      extends: `@${name}/typescript-config/api.json`,
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  )
  const index = `import express from 'express'
import cors from 'cors'

const PORT = Number(process.env.PORT) || 4000

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/items', (_req, res) => {
  res.json({
    data: [
      { id: '1', title: 'Example Item 1', createdAt: new Date().toISOString() },
      { id: '2', title: 'Example Item 2', createdAt: new Date().toISOString() },
    ],
    meta: { total: 2, limit: 20, offset: 0 },
  })
})

app.listen(PORT, () => {
  console.log(\`Example API running on http://localhost:\${PORT}\`)
})
`
  const envExample = `PORT=4000
`
  return { pkg, tsconfig, index, envExample }
}

function genExampleAppWeb(name) {
  const pkg = JSON.stringify(
    {
      name: `@${name}/example-web`,
      version: '0.0.1',
      private: true,
      scripts: {
        dev: 'next dev --port 4005',
        build: 'next build',
        start: 'next start',
        lint: 'eslint .',
        typecheck: 'tsc --noEmit',
      },
      dependencies: {
        next: '^15.3.0',
        react: '^19.1.0',
        'react-dom': '^19.1.0',
      },
      devDependencies: {
        [`@${name}/typescript-config`]: 'workspace:*',
        [`@${name}/eslint-config`]: 'workspace:*',
        [`@${name}/tailwind-config`]: 'workspace:*',
        [`@${name}/example-types`]: 'workspace:*',
        '@types/node': '^22.13.4',
        '@types/react': '^19.1.0',
        '@types/react-dom': '^19.1.0',
        tailwindcss: '^4.1.11',
        typescript: '^5.7.3',
      },
    },
    null,
    2
  )
  const tsconfig = JSON.stringify(
    {
      extends: `@${name}/typescript-config/nextjs.json`,
      compilerOptions: {
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['next-env.d.ts', 'src/**/*.ts', 'src/**/*.tsx', 'app/**/*.ts', 'app/**/*.tsx'],
      exclude: ['node_modules'],
    },
    null,
    2
  )
  const eslintConfig = `import { nextJsConfig } from "@${name}/eslint-config/next-js"

export default [...nextJsConfig]
`
  const layout = `import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${toPascalCase(name)} - Example App',
  description: 'Example app for the ${name} monorepo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`
  const page = `export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>${toPascalCase(name)} - Example App</h1>
      <p>Your monorepo is working. Edit <code>app/page.tsx</code> to get started.</p>
    </main>
  )
}
`
  return { pkg, tsconfig, eslintConfig, layout, page }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv)
  const { name, output, includeExample } = args
  const scope = `@${name}`
  const outDir = path.resolve(output)

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    console.error(`Output directory already exists and is not empty: ${outDir}`)
    process.exit(1)
  }

  console.log(`\nGenerating monorepo "${name}" at ${outDir}\n`)

  // --- Root files ---
  writeFile(path.join(outDir, 'package.json'), genRootPackageJson(name))
  writeFile(path.join(outDir, 'turbo.json'), genTurboJson())
  writeFile(path.join(outDir, 'pnpm-workspace.yaml'), genPnpmWorkspace())
  writeFile(path.join(outDir, 'tsconfig.json'), genRootTsconfig(name))
  writeFile(path.join(outDir, 'prettier.config.js'), genPrettierConfig())
  writeFile(path.join(outDir, '.gitignore'), genGitignore())
  writeFile(path.join(outDir, '.husky', 'pre-commit'), genHuskyPreCommit())
  writeFile(path.join(outDir, 'README.md'), genReadme(name))
  writeFile(path.join(outDir, 'BACKLOG.md'), genBacklog(name))
  writeFile(path.join(outDir, 'DEV-RULES.md'), genDevRules(name))

  // --- packages/typescript-config ---
  const tsConfigDir = path.join(outDir, 'packages', 'typescript-config')
  writeFile(path.join(tsConfigDir, 'package.json'), genTypescriptConfigPackageJson(name))
  // Copy src files directly from the current monorepo (they have no @ezstart refs)
  const tsSrcDir = path.join(ROOT_DIR, 'packages', 'typescript-config', 'src')
  copyDirRecursive(tsSrcDir, path.join(tsConfigDir, 'src'), null)

  // --- packages/eslint-config ---
  const eslintDir = path.join(outDir, 'packages', 'eslint-config')
  writeFile(path.join(eslintDir, 'package.json'), genEslintConfigPackageJson(name))
  // Copy src files (no @ezstart refs in the JS source)
  const eslintSrcDir = path.join(ROOT_DIR, 'packages', 'eslint-config', 'src')
  copyDirRecursive(eslintSrcDir, path.join(eslintDir, 'src'), null)

  // --- packages/tailwind-config ---
  const twDir = path.join(outDir, 'packages', 'tailwind-config')
  writeFile(path.join(twDir, 'package.json'), genTailwindConfigPackageJson(name))
  // Generate a clean tailwind base (no monorepo-specific content paths)
  writeFile(path.join(twDir, 'src', 'base.js'), genTailwindBase())

  // --- .claude/agents ---
  const agentsSrcDir = path.join(ROOT_DIR, '.claude', 'agents')
  const agentsDestDir = path.join(outDir, '.claude', 'agents')
  if (fs.existsSync(agentsSrcDir)) {
    const replaceScope = (content, _filename) => content.replace(/@ezstart/g, scope)
    copyDirRecursive(agentsSrcDir, agentsDestDir, replaceScope)
  }

  // --- apps/ directory ---
  mkdirp(path.join(outDir, 'apps'))

  // --- Example app (optional) ---
  if (includeExample) {
    console.log('\n  Generating example-app...')
    const exampleDir = path.join(outDir, 'apps', 'example-app')

    // types
    const types = genExampleAppTypes(name)
    writeFile(path.join(exampleDir, 'types', 'package.json'), types.pkg)
    writeFile(path.join(exampleDir, 'types', 'tsconfig.json'), types.tsconfig)
    writeFile(path.join(exampleDir, 'types', 'src', 'index.ts'), types.index)

    // api
    const api = genExampleAppApi(name)
    writeFile(path.join(exampleDir, 'api', 'package.json'), api.pkg)
    writeFile(path.join(exampleDir, 'api', 'tsconfig.json'), api.tsconfig)
    writeFile(path.join(exampleDir, 'api', 'src', 'index.ts'), api.index)
    writeFile(path.join(exampleDir, 'api', '.env.example'), api.envExample)

    // web
    const web = genExampleAppWeb(name)
    writeFile(path.join(exampleDir, 'web', 'package.json'), web.pkg)
    writeFile(path.join(exampleDir, 'web', 'tsconfig.json'), web.tsconfig)
    writeFile(path.join(exampleDir, 'web', 'eslint.config.mjs'), web.eslintConfig)
    writeFile(path.join(exampleDir, 'web', 'app', 'layout.tsx'), web.layout)
    writeFile(path.join(exampleDir, 'web', 'app', 'page.tsx'), web.page)

    // Update root tsconfig with references
    const rootTsconfig = JSON.parse(fs.readFileSync(path.join(outDir, 'tsconfig.json'), 'utf8'))
    rootTsconfig.references = [
      { path: './apps/example-app/types' },
      { path: './apps/example-app/api' },
    ]
    writeFile(path.join(outDir, 'tsconfig.json'), JSON.stringify(rootTsconfig, null, 2))

    // Update root package.json with example dev scripts
    const rootPkg = JSON.parse(fs.readFileSync(path.join(outDir, 'package.json'), 'utf8'))
    rootPkg.scripts['dev:example'] =
      'rimraf apps/example-app/web/.next && turbo run dev --filter=@' +
      name +
      '/example-web... --filter=@' +
      name +
      '/example-api... --concurrency=10'
    writeFile(path.join(outDir, 'package.json'), JSON.stringify(rootPkg, null, 2))
  }

  // --- Make husky pre-commit executable ---
  try {
    fs.chmodSync(path.join(outDir, '.husky', 'pre-commit'), 0o755)
  } catch (_e) {
    // chmod may not work on Windows, that's fine
  }

  console.log(`
Done! Your monorepo is ready at ${outDir}

Next steps:
  cd ${output}
  git init
  pnpm install
  pnpm dev
`)
}

main()
