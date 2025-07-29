# 📦 @ezstart/api-core

Backend API service for @ezstart/core

## 🚀 Getting Started

```bash
# 1️⃣ Clone only this package
git clone <your-repo-url>
cd api-core

# 2️⃣ Install dependencies
pnpm install

# 3️⃣ Run the package
pnpm dev
```

## 📂 Project Structure

### 📁 Quick Overview
- **controller-factory/** → Factory helpers to generate standard CRUD controllers
- **infra/** → Infrastructure utilities (MongoDB connection, app bootstrap, server start)
- **middlewares/** → Express middlewares for request validation (params, query, body)
- **openapi/** → Helpers for integrating Zod schemas with Swagger/OpenAPI
- **types/** → Augmented Express types and shared TypeScript definitions

👉 See the full structure here: [structure.md](./structure.md)
