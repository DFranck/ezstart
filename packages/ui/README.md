# @ezstart/ui

Modern, accessible, and reusable UI components library for the @ezstart monorepo.

## Overview

`@ezstart/ui` is a comprehensive design system built on **Radix UI** and **Tailwind CSS v4**. It provides 50+ high-quality components, custom hooks, utilities, and a complete theming system designed for maximum reusability across all @ezstart applications.

## Installation

This package is automatically included in all @ezstart applications:

```json
{
  "dependencies": {
    "@ezstart/ui": "workspace:*"
  }
}
```

## Quick Start

### 1. Import Global Styles

```css
/* app/globals.css */
@import "@ezstart/ui/globals.css";
```

### 2. Use Components

```tsx
import { Button, Card, Input } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'

export default function MyApp() {
  const { isMobile } = useDevice()
  
  return (
    <Card className={cn("p-6", isMobile && "p-4")}>
      <Input placeholder="Enter your email" />
      <Button variant="ezstart">Get Started</Button>
    </Card>
  )
}
```

## 🎨 Design System

### Theme System

Built-in support for light and dark themes with semantic colors:

```css
/* Semantic color variables */
--primary: 211 100% 50%;
--primary-foreground: 0 0% 98%;
--destructive: 0 84% 60%;
--success: 120 61% 50%;
--warning: 38 92% 50%;
--info: 200 98% 39%;
--ezstart: 198 93% 60%; /* Brand color */
```

### Color Palette

| Color | Usage | CSS Variable |
|-------|--------|-------------|
| **Primary** | Main actions, links | `hsl(var(--primary))` |
| **Secondary** | Secondary actions | `hsl(var(--secondary))` |
| **Destructive** | Errors, dangerous actions | `hsl(var(--destructive))` |
| **Success** | Success states | `hsl(var(--success))` |
| **Warning** | Warnings, alerts | `hsl(var(--warning))` |
| **Info** | Information states | `hsl(var(--info))` |
| **EZStart** | Brand identity | `hsl(var(--ezstart))` |
| **Muted** | Disabled states, placeholders | `hsl(var(--muted))` |

## 🧩 Components Library (50+ Components)

### Core Components

#### Button
```tsx
import { Button } from '@ezstart/ui/components'

<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ezstart">EZStart Style</Button>
<Button variant="linkedin">LinkedIn</Button>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `linkedin`, `ezstart`

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@ezstart/ui/components'

<Card variant="default">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content here
  </CardContent>
</Card>
```

**Variants:** `default`, `ghost`, `floating`, `dark`, `premium`, `elevated`

#### Input
```tsx
import { Input, Label } from '@ezstart/ui/components'

<div>
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    placeholder="Enter your email"
  />
</div>
```

### Form Components

#### Complete Form System
```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@ezstart/ui/components'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const schema = z.object({
  email: z.string().email()
})

export default function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema)
  })

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="Enter email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}
```

### Navigation Components

#### Header & Navigation
```tsx
import { Header, Nav, Burger } from '@ezstart/ui/components'

<Header>
  <Nav items={navItems} />
  <Burger /> {/* Mobile menu toggle */}
</Header>
```

#### Tabs
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@ezstart/ui/components'

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Dialog Components

#### Modal & Dialog
```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@ezstart/ui/components'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
    </DialogHeader>
    <p>Dialog content</p>
  </DialogContent>
</Dialog>
```

### Advanced Components

#### Carousel
```tsx
import { Carousel, CarouselContent, CarouselItem } from '@ezstart/ui/components'

<Carousel>
  <CarouselContent>
    <CarouselItem>Slide 1</CarouselItem>
    <CarouselItem>Slide 2</CarouselItem>
    <CarouselItem>Slide 3</CarouselItem>
  </CarouselContent>
</Carousel>
```

#### Icon System
```tsx
import { Icon } from '@ezstart/ui/components'

{/* Lucide icons */}
<Icon name="lucide:home" size={24} />
<Icon name="lucide:user" className="text-primary" />

{/* FontAwesome icons */}
<Icon name="fa:FaGithub" size={20} />

{/* Custom icons */}
<Icon name="custom:ezstart" size={32} />
```

**19+ Custom Icons Available:**
`ezstart`, `ezauth`, `email`, `password`, `google`, `facebook`, `linkedin`, `github`, `discord`, `youtube`, `twitter`, `instagram`, `monitor`, `laptop`, `tablet`, `mobile`, `check-circle`, `x-circle`, `info-circle`

## 🎣 Custom Hooks (6 hooks)

### useDevice
```tsx
import { useDevice } from '@ezstart/ui/hooks'

function ResponsiveComponent() {
  const { isMobile, isTablet, isDesktop } = useDevice()
  
  return (
    <div className={cn(
      "p-4",
      isMobile && "p-2",
      isTablet && "p-6", 
      isDesktop && "p-8"
    )}>
      Content
    </div>
  )
}
```

### useClickOutside
```tsx
import { useClickOutside } from '@ezstart/ui/hooks'

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useClickOutside(() => setIsOpen(false))
  
  return (
    <div ref={ref}>
      {isOpen && <DropdownContent />}
    </div>
  )
}
```

### useInView
```tsx
import { useInView } from '@ezstart/ui/hooks'

function AnimatedSection() {
  const { ref, inView } = useInView({ threshold: 0.1 })
  
  return (
    <div ref={ref} className={cn(
      "transition-opacity",
      inView ? "opacity-100" : "opacity-0"
    )}>
      Content appears when in view
    </div>
  )
}
```

### useApiAction
```tsx
import { useApiAction } from '@ezstart/ui/hooks'

function DataComponent() {
  const { execute, loading, error } = useApiAction(
    async (data) => callApi('/api/submit', { method: 'POST', body: data })
  )
  
  return (
    <Button 
      onClick={() => execute({ name: 'test' })}
      disabled={loading}
    >
      {loading ? 'Submitting...' : 'Submit'}
    </Button>
  )
}
```

## 🛠️ Utilities & Lib

### Core Utilities

#### cn() - Class Name Merger
```tsx
import { cn } from '@ezstart/ui/lib'

// Intelligently merges and deduplicates classes
<div className={cn(
  "p-4 bg-primary", 
  isActive && "bg-secondary", // Overrides bg-primary when active
  className // External className prop
)} />
```

### API Utilities

#### callApi() - Type-Safe HTTP Client
```tsx
import { callApi } from '@ezstart/ui/utils'

// GET request
const users = await callApi<User[]>('/api/users')

// POST with body
const newUser = await callApi<User>('/api/users', {
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' }
})

// With error handling
try {
  const result = await callApi('/api/data')
} catch (error) {
  console.error('API Error:', error.message)
}
```

#### runWithFeedback() - User Feedback
```tsx
import { runWithFeedback } from '@ezstart/ui/utils'

async function handleSubmit() {
  await runWithFeedback(
    async () => {
      // Your async operation
      await callApi('/api/submit', { method: 'POST', body: data })
    },
    {
      loadingMessage: 'Submitting...',
      successMessage: 'Submitted successfully!',
      errorMessage: 'Failed to submit'
    }
  )
}
```

## 📄 PDF Templates

### Built-in PDF Templates
```tsx
import { QuotePdfTemplate, InvoicePDF, ReceiptPDF } from '@ezstart/ui/templates'

// Generate quote PDF
<QuotePdfTemplate 
  quote={quoteData}
  onGenerated={(blob) => downloadPdf(blob, 'quote.pdf')}
/>

// Generate invoice PDF
<InvoicePDF 
  invoice={invoiceData}
  onGenerated={(blob) => downloadPdf(blob, 'invoice.pdf')}
/>
```

### useGeneratePdf Hook
```tsx
import { useGeneratePdf } from '@ezstart/ui/hooks'

function PdfGenerator() {
  const { generatePdf, loading } = useGeneratePdf()
  
  const handleGenerate = async () => {
    const blob = await generatePdf(
      <InvoicePDF invoice={invoiceData} />
    )
    downloadPdf(blob, 'invoice.pdf')
  }
  
  return (
    <Button onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : 'Generate PDF'}
    </Button>
  )
}
```

## 🎭 Animations & Effects

### Built-in Animations
- **Skeleton Loading** - Shimmer loading states
- **Text Gradients** - Animated gradient text effects
- **Aurora Effects** - Northern lights background animations
- **Slide Transitions** - Smooth enter/exit animations

```tsx
import { TextGradient } from '@ezstart/ui/components'

<TextGradient 
  from="#3b82f6" 
  to="#ef4444"
  className="text-4xl font-bold"
>
  Animated Gradient Text
</TextGradient>
```

## 🔧 Configuration

### PostCSS Configuration
The package provides a shared PostCSS configuration optimized for Tailwind v4:

```js
// postcss.config.mjs
export { default } from '@ezstart/ui/postcss.config'
```

### Tailwind Integration
Works seamlessly with `@ezstart/tailwind-config`:

```js
// tailwind.config.js
export { default } from '@ezstart/tailwind-config'
```

### TypeScript Support
Full TypeScript support with exported types:

```tsx
import type { ButtonProps, CardProps } from '@ezstart/ui/components'

interface MyButtonProps extends ButtonProps {
  customProp?: string
}
```

## 📱 Applications Using This Library

All @ezstart applications use this comprehensive UI library:

- ✅ **ezauth/web** - Authentication interface
- ✅ **ez-billing/web** - Billing management interface
- ✅ **ezstart/web** - Main application interface
- ✅ **fengshui/web** - Feng Shui application interface
- ✅ **tower-defense/web** - Game interface
- ✅ **asc-tcd/web** - Corporate website

## 🏗️ Package Architecture

### Modular Exports
```typescript
// Selective imports for optimal bundle size
import { Button, Card } from '@ezstart/ui/components'     // Components
import { useDevice } from '@ezstart/ui/hooks'             // Hooks
import { cn } from '@ezstart/ui/lib'                      // Core utilities
import { callApi } from '@ezstart/ui/utils'               // API utilities
import { QuotePdfTemplate } from '@ezstart/ui/templates'  // PDF templates

// Global styles
import '@ezstart/ui/globals.css'
```

### Tree Shaking
The package is optimized for tree shaking, allowing bundlers to only include used components:

```json
{
  "sideEffects": ["**/*.css"]
}
```

## 🎯 Design Principles

### 1. Semantic Classes
✅ **Use semantic color classes**
```tsx
<Button variant="destructive">Delete</Button>
<Card className="bg-muted text-muted-foreground">Info</Card>
```

❌ **Avoid hardcoded colors**
```tsx
<Button className="bg-red-500">Delete</Button>
```

### 2. Component Composition
✅ **Compose using provided components**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>
```

❌ **Don't use HTML elements directly**
```tsx
<div className="border rounded p-4">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

### 3. Accessibility First
- Built on Radix UI primitives for maximum accessibility
- ARIA attributes automatically applied
- Keyboard navigation support
- Screen reader friendly

## 🚀 Performance

- **Tree Shaking** - Only bundle what you use
- **CSS Variables** - Dynamic theming without runtime overhead
- **Radix UI** - Optimized, headless primitives
- **Tailwind v4** - Modern CSS framework with better performance

## Best Practices

### Import Strategy
```tsx
// ✅ Good: Selective imports
import { Button, Input } from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'

// ❌ Avoid: Barrel imports (if not tree-shaken)
import * as UI from '@ezstart/ui'
```

### Theme Usage
```tsx
// ✅ Good: Use CSS variables
className="bg-primary text-primary-foreground"

// ❌ Avoid: Hardcoded values
className="bg-blue-500 text-white"
```

### Responsive Design
```tsx
import { useDevice } from '@ezstart/ui/hooks'

// ✅ Good: Use useDevice hook
const { isMobile } = useDevice()
return <Button size={isMobile ? "sm" : "default"}>Action</Button>

// ✅ Also good: Tailwind responsive classes
<Button className="text-sm md:text-base">Action</Button>
```

## Development

### Building the Package
```bash
# Build TypeScript
pnpm build

# Watch mode
pnpm dev

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

### Testing Components
```bash
# Run in Storybook (if configured)
pnpm storybook

# Or test in consuming applications
cd ../../apps/ez-billing/web
pnpm dev
```

## Related Packages

- [`@ezstart/next-core`](../next-core/README.md) - Web application infrastructure using these components
- [`@ezstart/tailwind-config`](../tailwind-config/README.md) - Tailwind configuration optimized for these components
- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint rules for component development
- [`@ezstart/typescript-config`](../typescript-config/README.md) - TypeScript configuration