# @ezstart/ui

Accessible UI component library built on shadcn/Radix for all @ezstart web apps.

## Purpose

Single source of truth for all UI components, ensuring consistent design, dark mode support, and accessibility across every web app. All user-facing HTML must use these components instead of native elements.

## Tech Stack

- React, Tailwind CSS (OKLCH semantic colors), Radix UI primitives
- shadcn/ui base, customized with variants

## Architecture

```
ui/src/components/
├── layout/        # Card, Main, Header, Footer, Sidebar
├── forms/         # Input, Select, Checkbox, Switch, DatePicker
├── navigation/    # Tabs, Breadcrumb, Pagination, Sidebar
├── data-display/  # DataTable (TanStack), Badge, Avatar
├── overlay/       # Dialog, Sheet, Popover, Tooltip, Drawer
├── feedback/      # Alert, Skeleton, Progress, Spinner
├── tag/           # H1-H6, P, Label, Text (semantic HTML wrappers)
├── thread/        # Chat thread components
├── media/         # Image, video components
├── landing/       # Landing page sections
└── theme-selector # Theme toggle
```

## Usage

```typescript
import { Button, Card, Input, DataTable } from '@ezstart/ui/components'
import { useMediaQuery } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
```

## Adding Components

```bash
pnpm --filter @ezstart/ui ui:add [component-name]
```

## Used By

All web apps and packages (auth-sdk, pay-sdk, rbac, next-theme).
