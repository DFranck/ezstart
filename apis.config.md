# 📦 API Packages Configuration

## 🗂️ `api-ez-billing`
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

## 🗂️ `api-boilerplate`
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

## 🗂️ `api-monitor`
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

## 🗂️ `api-tower-defense`
📁 Path: `apps/td/api`

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
    "@workspace/eslint-config": "workspace:*",
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


# 📚 @workspace/typescript-config
📁 Path: `packages/typescript-config`

### api.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Node/Express + React JSX (API)",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": [
      "ES2022",
      "DOM"
    ],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "allowJs": true
  }
}
```

### base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "paths": {
      "@ezstart/ui/*": [
        "./packages/ui/src/*"
      ],
      "@ezstart/ui": [
        "./packages/libs/ez-icon/src/index.ts"
      ]
    },
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "lib": [
      "es2022",
      "DOM",
      "DOM.Iterable"
    ],
    "module": "NodeNext",
    "moduleDetection": "force",
    "moduleResolution": "NodeNext",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "strict": true,
    "target": "ES2022"
  }
}
```

### nextjs.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "jsx": "preserve",
    "noEmit": true
  }
}
```

### package.json

```json
{
  "name": "@workspace/typescript-config",
  "version": "0.0.1",
  "private": true,
  "license": "PROPRIETARY",
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


# ⚙️ @ezstart/api-core
📁 Path: `packages/api-core`

### descriptions.json

```json
{
  "controller-factory": "Factory helpers to generate standard CRUD controllers",
  "infra": "Infrastructure utilities (MongoDB connection, app bootstrap, server start)",
  "middlewares": "Express middlewares for request validation (params, query, body)",
  "openapi": "Helpers for integrating Zod schemas with Swagger/OpenAPI",
  "types": "Augmented Express types and shared TypeScript definitions"
}
```

### package.json

```json
{
  "name": "@ezstart/api-core",
  "description": "",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "dev": "tsc -b --watch",
    "typecheck": "tsc --noEmit"
  },
  "exports": {
    ".": {
      "import": "./src/index.ts"
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
  "extends": "@workspace/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "typeRoots": [
      "./node_modules/@types"
    ]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts"
  ],
  "files": [
    "src/types/express-aug.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### package.json

```json
{
  "name": "@ezstart/api-core",
  "description": "",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "dev": "tsc -b --watch",
    "typecheck": "tsc --noEmit"
  },
  "exports": {
    ".": {
      "import": "./src/index.ts"
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
  "extends": "@workspace/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "typeRoots": [
      "./node_modules/@types"
    ]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts"
  ],
  "files": [
    "src/types/express-aug.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```


# 🏠 Monorepo Root
📁 Path: `./`

### package.json

```json
{
  "name": "ezstart",
  "description": "Mono repo for ezstart projects",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "gen:readme": "tsx scripts/generate-readmes.ts",
    "gen:structure": "tsx scripts/generate-structures.ts",
    "gen:api-config": "tsx scripts/generate-apis-config.ts",
    "check:typecheck": "tsx scripts/check-typecheck.ts",
    "export:public": "tsx scripts/export-to-public.ts",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
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
    "ts-jest": "^29.3.4",
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
