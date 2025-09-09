#!/usr/bin/env node

/**
 * @ezstart/create-app - Script de génération automatique d'apps
 * 
 * Usage: node create-app.js my-new-app
 * Génère automatiquement une structure d'app complète avec :
 * - web/ (Next.js standardisé)
 * - api/ (Node.js API standardisée) 
 * - types/ (Types partagés web/api)
 * - utils/ (Utils partagés web/api)
 */

const fs = require('fs');
const path = require('path');

const appName = process.argv[2];

if (!appName) {
  console.error('❌ Usage: node create-app.js <app-name>');
  process.exit(1);
}

const appDir = path.join(__dirname, 'apps', appName);

if (fs.existsSync(appDir)) {
  console.error(`❌ App "${appName}" already exists`);
  process.exit(1);
}

console.log(`🚀 Creating app: ${appName}`);

// Structure de base
const structure = {
  [`apps/${appName}`]: 'dir',
  [`apps/${appName}/web`]: 'dir',
  [`apps/${appName}/api`]: 'dir', 
  [`apps/${appName}/types`]: 'dir',
  [`apps/${appName}/utils`]: 'dir',
  
  // Web - Next.js standardisé
  [`apps/${appName}/web/package.json`]: JSON.stringify({
    "name": `@${appName}/web`,
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "next dev",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "lint:fix": "next lint --fix",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "next": "15.1.3",
      "react": "19.0.0",
      "react-dom": "19.0.0",
      "@ezstart/ui": "workspace:*",
      "@ezstart/auth-sdk": "workspace:*"
    },
    "devDependencies": {
      "@types/node": "^20",
      "@types/react": "^18",
      "@types/react-dom": "^18",
      "eslint": "^8",
      "eslint-config-next": "15.1.3",
      "postcss": "^8",
      "tailwindcss": "^3.4.1",
      "typescript": "^5"
    }
  }, null, 2),
  
  [`apps/${appName}/web/tailwind.config.js`]: `import baseConfig from '@workspace/tailwind-config/base.js'
export default baseConfig`,

  [`apps/${appName}/web/postcss.config.mjs`]: `export { default } from '@ezstart/ui/postcss.config';`,
  
  [`apps/${appName}/web/eslint.config.js`]: `import { nextJsConfig } from "@workspace/eslint-config/next-js"
export default nextJsConfig`,

  [`apps/${appName}/web/tsconfig.json`]: JSON.stringify({
    "extends": "@workspace/typescript-config/next-js.json"
  }, null, 2),

  [`apps/${appName}/web/app/globals.css`]: `@import "@ezstart/ui/globals.css";`,
  
  [`apps/${appName}/web/app/layout.tsx`]: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '${appName}',
  description: '${appName} application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}`,

  [`apps/${appName}/web/app/page.tsx`]: `export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-4">${appName}</h1>
      <p className="text-muted-foreground">Welcome to your new app!</p>
    </main>
  )
}`,

  // API - Node.js standardisé
  [`apps/${appName}/api/package.json`]: JSON.stringify({
    "name": `@${appName}/api`,
    "version": "0.1.0",
    "private": true,
    "scripts": {
      "dev": "tsx watch server.ts",
      "build": "tsc",
      "start": "node dist/server.js",
      "lint": "eslint .",
      "lint:fix": "eslint . --fix",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "@ezstart/api-core": "workspace:*",
      "@ezstart/types": "workspace:*",
      "express": "^4.18.2",
      "cors": "^2.8.5"
    },
    "devDependencies": {
      "@types/express": "^4.17.17",
      "@types/cors": "^2.8.13",
      "@types/node": "^20",
      "tsx": "^4.0.0",
      "typescript": "^5"
    }
  }, null, 2),

  [`apps/${appName}/api/tsconfig.json`]: JSON.stringify({
    "extends": "@workspace/typescript-config/api.json"
  }, null, 2),

  [`apps/${appName}/api/server.ts`]: `import { startServer } from '@ezstart/api-core'
import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '${appName}-api' })
})

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from ${appName}!' })
})

startServer(app, {
  port: 3000,
  name: '${appName}'
})`,

  // Types partagés
  [`apps/${appName}/types/package.json`]: JSON.stringify({
    "name": `@${appName}/types`,
    "version": "0.1.0",
    "private": true,
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
      "@ezstart/types": "workspace:*",
      "typescript": "^5"
    }
  }, null, 2),

  [`apps/${appName}/types/tsconfig.json`]: JSON.stringify({
    "extends": "@workspace/typescript-config/types.json"
  }, null, 2),

  [`apps/${appName}/types/src/index.ts`]: `// ${appName} specific types
export * from './user'`,

  [`apps/${appName}/types/src/user.ts`]: `import { BaseUser } from '@ezstart/types'

export interface ${appName.charAt(0).toUpperCase() + appName.slice(1)}User extends BaseUser {
  // Add ${appName}-specific user properties here
}`,

  // Utils partagés
  [`apps/${appName}/utils/package.json`]: JSON.stringify({
    "name": `@${appName}/utils`,
    "version": "0.1.0", 
    "private": true,
    "main": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "scripts": {
      "build": "tsc",
      "dev": "tsc --watch",
      "typecheck": "tsc --noEmit"
    },
    "devDependencies": {
      "@ezstart/types": "workspace:*",
      "typescript": "^5"
    }
  }, null, 2),

  [`apps/${appName}/utils/tsconfig.json`]: JSON.stringify({
    "extends": "@workspace/typescript-config/library.json"
  }, null, 2),

  [`apps/${appName}/utils/src/index.ts`]: `// ${appName} specific utilities
export * from './helpers'`,

  [`apps/${appName}/utils/src/helpers.ts`]: `// Helper functions for ${appName}
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
  
export function formatAppName(): string {
  return capitalize('${appName}')
}`
};

// Créer la structure
for (const [filePath, content] of Object.entries(structure)) {
  const fullPath = path.join(__dirname, filePath);
  
  if (content === 'dir') {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${filePath}`);
  } else {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    console.log(`📄 Created file: ${filePath}`);
  }
}

console.log(`\n✅ App "${appName}" created successfully!`);
console.log(`\n🚀 Next steps:`);
console.log(`   cd apps/${appName}/web && pnpm install && pnpm dev`);
console.log(`   cd apps/${appName}/api && pnpm install && pnpm dev`);
console.log(`\n📖 Your app structure:`);
console.log(`   apps/${appName}/`);
console.log(`   ├── web/        # Next.js frontend`);
console.log(`   ├── api/        # Node.js backend`);
console.log(`   ├── types/      # Shared TypeScript types`);
console.log(`   └── utils/      # Shared utilities`);