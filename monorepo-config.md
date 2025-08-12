# 🏗️ Monorepo Configuration Overview

## 📋 Summary

This document contains all configuration files for the monorepo packages.


## Unknowns (1)

**Recommended tsconfig:** `@workspace/typescript-config/base.json`

### 🗂️ `ezstart`
📁 Path: ``

### package.json

```json
{
  "name": "ezstart",
  "description": "Mono repo for ezstart projects",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --concurrency 50",
    "dev:ezstart": "turbo run dev --filter=web-ezstart...",
    "dev:asc": "turbo run dev --filter=web-asc-tcd...",
    "dev:td": "turbo run dev --filter=pwa-tower-defense... --filter=api-tower-defense...",
    "gen:readme": "tsx scripts/generate-readmes.ts",
    "gen:types": "tsx scripts/generate-readmes-types.ts",
    "gen:structure": "tsx scripts/generate-structures.ts",
    "gen:config": "tsx scripts/generate-config.ts",
    "check:typecheck": "tsx scripts/check-typecheck.ts",
    "export:public": "tsx scripts/export-to-public.ts",
    "lint": "turbo run lint",
    "prune": "ts-prune -p tsconfig.json > prune-report.txt",
    "typecheck": "turbo run typecheck",
    "clean": "tsx scripts/clean.ts"
  },
  "jest": {
    "projects": [
      "<rootDir>/apps/ezstart/api"
    ]
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/jest": "^29.5.14",
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "eslint": "^9.27.0",
    "fs-extra": "^11.3.0",
    "jest": "^29.7.0",
    "ora": "^5.4.1",
    "prettier": "^3.5.1",
    "rimraf": "^6.0.1",
    "ts-jest": "^29.3.4",
    "ts-prune": "^0.10.3",
    "tsx": "^4.20.3",
    "turbo": "^2.4.2",
    "typescript": "5.7.3"
  },
  "packageManager": "pnpm@10.12.2+sha256.07b2396c6c99a93b75b5f9ce22be9285c3b2533c49fec51b349d44798cf56b82",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@eslint/js": "^9.29.0",
    "zod": "^3.25.28"
  }
}
```

### tsconfig.json

```json
{
  "extends": "./packages/typescript-config/tsconfig.json",
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": [
        "^build"
      ],
      "inputs": [
        "$TURBO_DEFAULT$",
        ".env*"
      ],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "**/dist/**"
      ]
    },
    "lint": {
      "dependsOn": [
        "^lint"
      ]
    },
    "typecheck": {
      "dependsOn": [
        "^typecheck"
      ]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/base.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```


## Web Apps (2)

**Recommended tsconfig:** `@workspace/typescript-config/nextjs.json`

### 🗂️ `web-asc-tcd`
📁 Path: `apps/asc-tcd/web`

### package.json

```json
{
  "name": "web-asc-tcd",
  "description": "",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3101",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ezstart/types": "workspace:*",
    "@ezstart/ui": "workspace:*",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@tanstack/react-virtual": "^3.13.8",
    "deepmerge": "^4.3.1",
    "framer-motion": "^12.10.1",
    "next": "^15.2.3",
    "next-intl": "^4.1.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19",
    "@workspace/eslint-config": "workspace:^",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "plugins": [
      {
        "name": "next"
      }
    ],
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "include": [
    "next-env.d.ts",
    "next.config.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    "app/[locale]/(views)/ez-features/[feature]/(billing)/dev/ui/ClientE.tsxE",
    "../../../packages/ui/components/layout-with-aside.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### 🗂️ `web-ezstart`
📁 Path: `apps/ezstart/web`

### package.json

```json
{
  "name": "web-ezstart",
  "description": "",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3100",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ezstart/types": "workspace:*",
    "@ezstart/ui": "workspace:*",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@tanstack/react-virtual": "^3.13.8",
    "deepmerge": "^4.3.1",
    "framer-motion": "^12.10.1",
    "next": "^15.2.3",
    "next-intl": "^4.1.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.3"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19",
    "@workspace/eslint-config": "workspace:^",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "plugins": [
      {
        "name": "next"
      }
    ],
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "include": [
    "next-env.d.ts",
    "next.config.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```


## Next.js Apps (1)

**Recommended tsconfig:** `@workspace/typescript-config/nextjs.json`

### 🗂️ `spa-boilerplate`
📁 Path: `apps/boilerplate/spa`

### package.json

```json
{
  "name": "spa-boilerplate",
  "description": "A minimal Next.js boilerplate for single-page apps.",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3102",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "deepmerge": "^4.3.1",
    "framer-motion": "^12.10.1",
    "next": "^15.2.3",
    "next-intl": "^4.1.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.3",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.11",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.4.21",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.2.3",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.11",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": [
        "*"
      ]
    },
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "module": "esnext",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "noEmit": true,
    "moduleResolution": "bundler",
    "allowJs": true,
    "incremental": true,
    "target": "ES2017",
    "skipLibCheck": true,
    "strict": false,
    "esModuleInterop": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "next.config.mjs",
    "src",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "next": "^15.4.5",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```


## APIs (4)

**Recommended tsconfig:** `@workspace/typescript-config/api.json`

### 🗂️ `api-ez-billing`
📁 Path: `apps/ez-billing/api`

### package.json

```json
{
  "name": "api-ez-billing",
  "version": "0.0.1",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "prebuild": "pnpm --filter @ezstart/types build",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.19.2",
    "mongoose": "^8.15.1",
    "node-cron": "^4.1.0",
    "puppeteer": "^24.9.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^4.17.21",
    "@types/express-serve-static-core": "^4.19.6",
    "@types/jest": "^29.5.14",
    "@types/node": "^20.7.0",
    "@types/node-cron": "^3.0.11",
    "@types/react": "^19.1.5",
    "@types/react-dom": "^19.1.5",
    "@types/supertest": "^6.0.3",
    "@workspace/eslint-config": "workspace:*",
    "jest": "^29.7.0",
    "supertest": "^7.1.1",
    "ts-jest": "^29.3.4",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": [
      "jest",
      "node"
    ],
    "typeRoots": [
      "../../../packages/types",
      "./node_modules/@types"
    ]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "../../../packages/types/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/api.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0"
  }
}
```

### 🗂️ `api-boilerplate`
📁 Path: `apps/ezstart/api`

### package.json

```json
{
  "name": "api-boilerplate",
  "version": "0.0.1",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "prebuild": "pnpm --filter @ezstart/types build",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "@ezstart/types": "workspace:*",
    "@ezstart/api-core": "workspace:*",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.19.2",
    "mongoose": "^8.15.1",
    "node-cron": "^4.1.0",
    "puppeteer": "^24.9.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:^",
    "@types/cors": "^2.8.18",
    "@types/express": "^4.17.21",
    "@types/express-serve-static-core": "^4.19.6",
    "@types/jest": "^29.5.14",
    "@types/node": "^20.7.0",
    "@types/node-cron": "^3.0.11",
    "@types/react": "^19.1.5",
    "@types/react-dom": "^19.1.5",
    "@types/supertest": "^6.0.3",
    "jest": "^29.7.0",
    "supertest": "^7.1.1",
    "ts-jest": "^29.3.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": [
      "jest",
      "node"
    ],
    "typeRoots": [
      "../../../packages/types",
      "./node_modules/@types"
    ]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "../../../packages/types/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/api.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0"
  }
}
```

### 🗂️ `api-monitor`
📁 Path: `apps/monitor/api`

### package.json

```json
{
  "name": "api-monitor",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node --loader ts-node/esm index.ts",
    "test": "echo \"Error: no test specified\" && exit 1",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "node-fetch": "^3.3.2"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.11.0",
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "ts-node": "^10.9.2",
    "typescript": "^5.8.3"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Node",
    "esModuleInterop": true
  }
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/api.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0"
  }
}
```

### 🗂️ `api-tower-defense`
📁 Path: `apps/tower-defense/api`

### package.json

```json
{
  "name": "api-tower-defense",
  "version": "0.0.1",
  "main": "dist/server.js",
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "prebuild": "pnpm --filter @ezstart/types build",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "@ezstart/ui": "workspace:*",
    "@tower-defense/config": "workspace:*",
    "@tower-defense/types": "workspace:*",
    "@tower-defense/utils": "workspace:*",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.19.2",
    "mongoose": "^8.15.1",
    "node-cron": "^4.1.0",
    "puppeteer": "^24.9.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "socket.io": "^4.8.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^4.17.21",
    "@types/express-serve-static-core": "^4.19.6",
    "@types/jest": "^29.5.14",
    "@types/node": "^20.7.0",
    "@types/node-cron": "^3.0.11",
    "@types/react": "^19.1.5",
    "@types/react-dom": "^19.1.5",
    "@types/socket.io": "^3.0.2",
    "@types/supertest": "^6.0.3",
    "@workspace/eslint-config": "workspace:*",
    "jest": "^29.7.0",
    "supertest": "^7.1.1",
    "ts-jest": "^29.3.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": [
      "jest",
      "node"
    ]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "sockets/joinGameSocket.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/api.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "dependencies": {
    "@ezstart/api-core": "workspace:*",
    "@ezstart/types": "workspace:*",
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0"
  }
}
```


## Tower Defense Packages (3)

**Recommended tsconfig:** `@workspace/typescript-config/package.json`

### 🗂️ `@tower-defense/config`
📁 Path: `apps/tower-defense/config`

### package.json

```json
{
  "name": "@tower-defense/config",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "dev": "tsc -b --watch",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.12.2",
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### 🗂️ `@tower-defense/types`
📁 Path: `apps/tower-defense/types`

### package.json

```json
{
  "name": "@tower-defense/types",
  "version": "0.1.0",
  "description": "",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "type": "module",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    },
    "./*": {
      "import": "./src/*.ts",
      "types": "./src/*.ts"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "dev": "tsc -b --watch",
    "test": "echo \"Error: no test specified\" && exit 1",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3.4",
    "@tower-defense/config": "workspace:*",
    "@ezstart/types": "workspace:*"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.11.0",
  "devDependencies": {
    "@anatine/zod-mock": "^3.14.0"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "emitDeclarationOnly": false
  },
  "include": [
    "src"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### 🗂️ `@tower-defense/utils`
📁 Path: `apps/tower-defense/utils`

### package.json

```json
{
  "name": "@tower-defense/utils",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "tsc -b --watch",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "dependencies": {
    "@tower-defense/types": "workspace:*",
    "@tower-defense/config": "workspace:*"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.12.2",
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```


## PWAs (1)

**Recommended tsconfig:** `@workspace/typescript-config/nextjs.json`

### 🗂️ `pwa-tower-defense`
📁 Path: `apps/tower-defense/pwa`

### package.json

```json
{
  "name": "pwa-tower-defense",
  "description": "Competitive multiplayer Tower Defense game. Combines RNG shop mechanics (auto-battler style), dynamic pathing with free tower placement, and unit-sending PvP (old school Warcraft TD). Players build, defend, and attack in a real-time loop with evolving income. High replayability and skill-based late game.",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack -p 3102",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ezstart/types": "workspace:*",
    "@ezstart/ui": "workspace:*",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@tanstack/react-virtual": "^3.13.8",
    "@tower-defense/config": "workspace:*",
    "@tower-defense/types": "workspace:*",
    "@tower-defense/utils": "workspace:*",
    "deepmerge": "^4.3.1",
    "framer-motion": "^12.10.1",
    "next": "^15.2.3",
    "next-intl": "^4.1.0",
    "next-themes": "^0.4.6",
    "pathfinding": "^0.4.18",
    "pixi.js": "^7.4.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.8.1",
    "sonner": "^2.0.3",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19",
    "@types/socket.io-client": "^3.0.0",
    "@workspace/eslint-config": "workspace:^",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "plugins": [
      {
        "name": "next"
      }
    ],
    "lib": [
      "dom",
      "dom.iterable",
      "esnext"
    ],
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve"
  },
  "include": [
    "next-env.d.ts",
    "next.config.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```


## Packages (3)

**Recommended tsconfig:** `@workspace/typescript-config/package.json`

### 🗂️ `@ezstart/api-core`
📁 Path: `packages/api-core`

### package.json

```json
{
  "name": "@ezstart/api-core",
  "description": "",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "tsc -b --watch",
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3.4",
    "@ezstart/types": "workspace:*",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^4.19.2",
    "mongoose": "^8.15.1",
    "socket.io": "^4.8.1",
    "swagger-autogen": "^2.23.7",
    "swagger-ui-express": "^5.0.1",
    "yamljs": "^0.3.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.18",
    "@types/express": "^4.17.21",
    "@types/socket.io": "^3.0.2",
    "@types/swagger-ui-express": "^4.1.8",
    "@types/yamljs": "^0.2.34",
    "typescript": "^5.7.3"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

### 🗂️ `@ezstart/types`
📁 Path: `packages/types`

### package.json

```json
{
  "name": "@ezstart/types",
  "version": "0.1.0",
  "description": "",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "dev": "tsc -b --watch",
    "test": "echo \"Error: no test specified\" && exit 1",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^7.3.4"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "packageManager": "pnpm@10.11.0",
  "devDependencies": {
    "@anatine/zod-mock": "^3.14.0"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@workspace/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "emitDeclarationOnly": false
  },
  "include": [
    "**/*.ts",
    "**/*.d.ts"
  ],
  "files": [
    "express/aug.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```

### 🗂️ `@ezstart/ui`
📁 Path: `packages/ui`

### package.json

```json
{
  "name": "@ezstart/ui",
  "version": "0.1.0",
  "type": "module",
  "private": false,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "typesVersions": {
    "*": {
      "*": [
        "dist/*"
      ]
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "tsc -b --watch",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "dependencies": {
    "@ezstart/types": "workspace:*",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-tooltip": "^1.2.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "embla-carousel-react": "^8.6.0",
    "lucide-react": "^0.475.0",
    "next-intl": "^4.1.0",
    "next-themes": "^0.4.6",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-icons": "^5.5.0",
    "sonner": "^2.0.3",
    "tailwind-merge": "^3.0.1",
    "tw-animate-css": "^1.2.4",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.8",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@turbo/gen": "^2.4.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "tailwindcss": "^4.0.8",
    "typescript": "^5.7.3"
  },
  "exports": {
    "./globals.css": "./styles/globals.css",
    "./postcss.config": "./postcss.config.mjs",
    "./components": {
      "import": "./dist/components/index.js",
      "types": "./dist/components/index.d.ts"
    },
    "./hooks": {
      "import": "./dist/hooks/index.js",
      "types": "./dist/hooks/index.d.ts"
    },
    "./lib": {
      "import": "./dist/lib/index.js",
      "types": "./dist/lib/index.d.ts"
    },
    "./templates": {
      "import": "./dist/templates/index.js",
      "types": "./dist/templates/index.d.ts"
    },
    "./utils": {
      "import": "./dist/utils/index.js",
      "types": "./dist/utils/index.d.ts"
    }
  }
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  },
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  }
}
```


## Workspace Packages (2)

**Recommended tsconfig:** `@workspace/typescript-config/package.json`

### 🗂️ `@workspace/eslint-config`
📁 Path: `packages/eslint-config`

### package.json

```json
{
  "name": "@workspace/eslint-config",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "exports": {
    "./base": "./base.js",
    "./next-js": "./next.js",
    "./react-internal": "./react-internal.js"
  },
  "devDependencies": {
    "@next/eslint-plugin-next": "^15.1.7",
    "@typescript-eslint/eslint-plugin": "^8.24.1",
    "@typescript-eslint/parser": "^8.24.1",
    "eslint": "^9.27.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-only-warn": "^1.1.0",
    "eslint-plugin-react": "^7.37.4",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-turbo": "^2.4.2",
    "globals": "^15.15.0",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.1"
  }
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

### 🗂️ `@workspace/typescript-config`
📁 Path: `packages/typescript-config`

### package.json

```json
{
  "name": "@workspace/typescript-config",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "files": [
    "base.json",
    "api.json",
    "package.json",
    "nextjs.json",
    "react-library.json"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

#### 💡 Recommendations

**Recommended tsconfig.json:**

```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```

**Recommended package.json structure:**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx"
  },
  "devDependencies": {
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```


## ⚙️ Workspace Configurations

### 📝 TypeScript Configurations

### api.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "API Configuration",
  "extends": "./base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": [
      "node"
    ]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### nextjs.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js Configuration",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "dom",
      "dom.iterable",
      "es6"
    ],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": [
        "./src/*"
      ],
      "@/components/*": [
        "./components/*"
      ],
      "@/lib/*": [
        "./lib/*"
      ],
      "@/utils/*": [
        "./utils/*"
      ]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### package.json

```json
{
  "name": "@workspace/typescript-config",
  "version": "0.0.1",
  "private": true,
  "license": "MIT",
  "files": [
    "base.json",
    "api.json",
    "package.json",
    "nextjs.json",
    "react-library.json"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### react-library.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "React Library",
  "extends": "./base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": [
      "react",
      "react/jsx-runtime"
    ],
    "lib": [
      "DOM",
      "ESNext",
      "DOM.Iterable"
    ]
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```


### 🏠 Root Configurations

### package.json

```json
{
  "name": "ezstart",
  "description": "Mono repo for ezstart projects",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev --concurrency 50",
    "dev:ezstart": "turbo run dev --filter=web-ezstart...",
    "dev:asc": "turbo run dev --filter=web-asc-tcd...",
    "dev:td": "turbo run dev --filter=pwa-tower-defense... --filter=api-tower-defense...",
    "gen:readme": "tsx scripts/generate-readmes.ts",
    "gen:types": "tsx scripts/generate-readmes-types.ts",
    "gen:structure": "tsx scripts/generate-structures.ts",
    "gen:config": "tsx scripts/generate-config.ts",
    "check:typecheck": "tsx scripts/check-typecheck.ts",
    "export:public": "tsx scripts/export-to-public.ts",
    "lint": "turbo run lint",
    "prune": "ts-prune -p tsconfig.json > prune-report.txt",
    "typecheck": "turbo run typecheck",
    "clean": "tsx scripts/clean.ts"
  },
  "jest": {
    "projects": [
      "<rootDir>/apps/ezstart/api"
    ]
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/jest": "^29.5.14",
    "@workspace/eslint-config": "workspace:*",
    "@workspace/typescript-config": "workspace:*",
    "eslint": "^9.27.0",
    "fs-extra": "^11.3.0",
    "jest": "^29.7.0",
    "ora": "^5.4.1",
    "prettier": "^3.5.1",
    "rimraf": "^6.0.1",
    "ts-jest": "^29.3.4",
    "ts-prune": "^0.10.3",
    "tsx": "^4.20.3",
    "turbo": "^2.4.2",
    "typescript": "5.7.3"
  },
  "packageManager": "pnpm@10.12.2+sha256.07b2396c6c99a93b75b5f9ce22be9285c3b2533c49fec51b349d44798cf56b82",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@eslint/js": "^9.29.0",
    "zod": "^3.25.28"
  }
}
```

### tsconfig.json

```json
{
  "extends": "./packages/typescript-config/tsconfig.json",
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```


## 🚀 Quick Start Guide


### Creating a new API project:
```bash
mkdir apps/my-api
cd apps/my-api
```

**package.json:**
```json
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
```

**tsconfig.json:**
```json
{
  "extends": "@workspace/typescript-config/api.json"
}
```

### Creating a new Next.js app:
```bash
mkdir apps/my-web
cd apps/my-web
```

**package.json:**
```json
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
```

**tsconfig.json:**
```json
{
  "extends": "@workspace/typescript-config/nextjs.json"
}
```

### Creating a new package:
```bash
mkdir packages/my-package
cd packages/my-package
```

**package.json:**
```json
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
```

**tsconfig.json:**
```json
{
  "extends": "@workspace/typescript-config/package.json"
}
```
