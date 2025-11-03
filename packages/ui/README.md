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

### Monitoring Status Colors

Semantic colors for service health monitoring and status indicators:

| Status | Usage | Tailwind Class | CSS Variable |
|--------|-------|----------------|-------------|
| **Healthy** | Service operational | `bg-status-healthy` | `var(--status-healthy)` |
| **Degraded** | Partial issues | `bg-status-degraded` | `var(--status-degraded)` |
| **Unhealthy** | Service down | `bg-status-unhealthy` | `var(--status-unhealthy)` |
| **Unknown** | No data available | `bg-status-unknown` | `var(--status-unknown)` |

### Platform Colors

Brand colors for deployment platforms:

| Platform | Tailwind Class | CSS Variable |
|----------|----------------|-------------|
| **Railway** | `bg-platform-railway` | `var(--platform-railway)` |
| **Render** | `bg-platform-render` | `var(--platform-render)` |
| **Vercel** | `bg-platform-vercel` | `var(--platform-vercel)` |

**Example usage:**
```tsx
// Status badges
<Badge className="bg-status-healthy/10 text-status-healthy">
  Healthy
</Badge>

// Platform badges
<Badge className="bg-platform-railway/10 text-platform-railway">
  Railway
</Badge>
```

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

**Enhanced with interactive states** - Hover effects and clickable variants

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@ezstart/ui/components'

// Basic card
<Card variant="default">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content here
  </CardContent>
</Card>

// Interactive clickable card
<Card
  interactive
  hover="lift"
  onClick={() => navigate('/details')}
>
  <CardHeader>
    <CardTitle>Clickable Card</CardTitle>
  </CardHeader>
  <CardContent>
    Click me to navigate
  </CardContent>
</Card>

// Hover effects
<Card hover="glow">
  <CardContent>Glowing hover effect</CardContent>
</Card>

<Card hover="scale">
  <CardContent>Scale on hover</CardContent>
</Card>

<Card hover="border">
  <CardContent>Border highlight on hover</CardContent>
</Card>

// Premium variant with gradient
<Card variant="premium" size="lg">
  <CardHeader>
    <CardTitle>Premium Feature</CardTitle>
  </CardHeader>
  <CardContent>
    Beautiful gradient background
  </CardContent>
</Card>
```

**Variants:** `default`, `ghost`, `floating`, `dark`, `premium`, `elevated`

**Sizes:** `xs`, `sm`, `default`, `lg`, `xl`

**Interactive Props:**
- `interactive` - Makes card clickable (adds cursor pointer, role, tabIndex)
- `hover` - Hover effect: `none`, `lift` (translate up), `glow` (shadow), `border` (highlight), `scale` (zoom)

**Use Cases:**
- Static information cards (`hover="none"`)
- Navigation cards (`interactive hover="lift"`)
- Feature highlights (`hover="glow"`)
- Clickable tiles (`interactive hover="scale"`)

#### Badge

**100% configurable with dot indicator and pulse animation**

```tsx
import { Badge } from '@ezstart/ui/components'

// Basic variants
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="info">Info</Badge>

// With sizes
<Badge size="sm">Small</Badge>
<Badge size="default">Default</Badge>
<Badge size="lg">Large</Badge>

// With dot indicator
<Badge variant="success" dot>3 new</Badge>
<Badge variant="destructive" dot>5 errors</Badge>

// With pulse animation (real-time status)
<Badge variant="success" pulse>Live</Badge>
<Badge variant="info" dot pulse>Processing...</Badge>

// Color variants
<Badge variant="purple">Purple</Badge>
<Badge variant="cyan">Cyan</Badge>
<Badge variant="indigo">Indigo</Badge>
<Badge variant="pink">Pink</Badge>
```

**Props:**
- `variant` - Color variant: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `info`, `purple`, `cyan`, `indigo`, `pink`
- `size` - Size: `sm`, `default`, `lg`
- `dot` - Show dot indicator before text
- `pulse` - Pulse animation for real-time status

**Use Cases:**
- Status indicators (active, inactive, pending)
- Notification counts (3 new messages)
- Real-time status (live stream, processing)
- Tags and labels

#### Input

**Enhanced with icon support** - Start and end icons for better UX

```tsx
import { Input, Label, Icon } from '@ezstart/ui/components'

// Basic input
<Input type="email" placeholder="Email" />

// With start icon (search, email, etc.)
<Input
  type="search"
  placeholder="Search..."
  startIcon={<Icon name="lucide:Search" size={16} />}
/>

// With end icon (clear button, etc.)
<Input
  type="text"
  placeholder="Username"
  endIcon={<Icon name="lucide:X" size={16} />}
/>

// With label
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    startIcon={<Icon name="lucide:Mail" size={16} />}
  />
</div>
```

**Props:**
- `startIcon` - Icon displayed at the start of input
- `endIcon` - Icon displayed at the end of input
- `wrapperClassName` - Custom className for icon wrapper

#### Textarea

**Enhanced with auto-resize and character counting**

```tsx
import { TextArea } from '@ezstart/ui/components'

// Basic usage
<TextArea label="Description" placeholder="Enter description..." />

// With auto-resize (grows with content)
<TextArea
  label="Comments"
  autoResize
  maxRows={10}
  placeholder="Type your comment..."
/>

// With character count
<TextArea
  label="Bio"
  showCharCount
  maxLength={500}
  placeholder="Tell us about yourself..."
/>

// Combined features
<TextArea
  label="Message"
  autoResize
  maxRows={8}
  showCharCount
  maxLength={1000}
  placeholder="Your message..."
/>
```

**Props:**
- `label` - Label text above textarea
- `autoResize` - Automatically resize based on content
- `maxRows` - Maximum rows when auto-resizing (default: 10)
- `showCharCount` - Display character count
- `maxLength` - Maximum character limit

#### Skeleton

**Loading state placeholders with shimmer animation**

```tsx
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonAvatar,
  SkeletonForm
} from '@ezstart/ui/components'

// Basic skeleton (custom shapes)
<Skeleton className="h-12 w-full" />
<Skeleton className="h-4 w-3/4" />

// Text skeleton (multiple lines)
<SkeletonText lines={3} />
<SkeletonText lines={2} spacing="loose" variant="shimmer" />

// Avatar skeleton
<SkeletonAvatar size="md" />
<SkeletonAvatar size="lg" variant="shimmer" />

// Card skeleton (with header and content)
<SkeletonCard />
<SkeletonCard showHeader showFooter lines={4} variant="shimmer" />

// Table skeleton
<SkeletonTable rows={5} cols={4} showHeader />

// List skeleton (with avatar + content)
<SkeletonList items={3} showAvatar variant="shimmer" />

// Form skeleton (input fields + button)
<SkeletonForm fields={4} showButton />
```

**Real-world usage examples:**

```tsx
// Loading states in data-fetching components
function WorkspacesList() {
  const { data, isLoading } = useWorkspaces()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} variant="shimmer" />
        ))}
      </div>
    )
  }

  return <div>{/* actual content */}</div>
}

// Loading tables
function InvoicesTable() {
  const { invoices, isLoading } = useInvoices()

  if (isLoading) {
    return <SkeletonTable rows={10} cols={5} showHeader />
  }

  return <Table>{/* actual data */}</Table>
}

// Loading lists with avatars
function UsersList() {
  const { users, isLoading } = useUsers()

  if (isLoading) {
    return <SkeletonList items={5} showAvatar variant="shimmer" />
  }

  return <div>{/* actual users */}</div>
}
```

**Components:**

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Skeleton` | Base skeleton for custom shapes | `variant`, `className` |
| `SkeletonText` | Multiple lines of text | `lines`, `spacing` |
| `SkeletonAvatar` | Circular profile pictures | `size` |
| `SkeletonCard` | Card with header/content/footer | `showHeader`, `showFooter`, `lines`, `size` |
| `SkeletonTable` | Table with rows and columns | `rows`, `cols`, `showHeader` |
| `SkeletonList` | List items with avatar + content | `items`, `showAvatar` |
| `SkeletonForm` | Form fields + submit button | `fields`, `showButton` |

**Props:**
- `variant` - Animation style: `default`, `lighter`, `darker`, `shimmer` (recommended)
- `size` - Component size: `xs`, `sm`, `default`, `lg`, `xl`
- `spacing` - Text line spacing: `tight`, `normal`, `loose`
- All skeleton components accept `className` for custom styling

**Best Practices:**
- Use `variant="shimmer"` for modern loading animations
- Match skeleton layout to actual content for smooth transitions
- Show 3-5 skeleton items to indicate loading without overwhelming
- Combine with Suspense boundaries for React 18+ streaming SSR

**Use Cases:**
- Data-fetching components (React Query, SWR, fetch)
- Dashboard loading states
- Table and list placeholders
- Form initialization
- Image loading placeholders

#### ErrorBoundary

**Universal error boundary for catching React errors**

```tsx
import { ErrorBoundary } from '@ezstart/ui/components'

// Basic usage
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom title and description
<ErrorBoundary
  title="Something went wrong in MyApp"
  description="Don't worry, your data is safe. Please try again."
>
  <MyApp />
</ErrorBoundary>

// With Sentry integration
<ErrorBoundary
  onError={(error, errorInfo) => {
    Sentry.captureException(error, { extra: errorInfo })
  }}
  onReset={() => {
    // Optional: cleanup before retry
  }}
>
  <MyComponent />
</ErrorBoundary>

// Full page variant (for root layouts)
<ErrorBoundary variant="full" maxRetries={3}>
  <App />
</ErrorBoundary>

// Minimal variant (inline)
<ErrorBoundary variant="minimal" showResetButton={false}>
  <Widget />
</ErrorBoundary>
```

**Real-world usage in app layouts:**

```tsx
// apps/myapp/web/src/app/[locale]/layout.tsx
import { ErrorBoundary } from '@ezstart/ui/components'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary
          title="Something went wrong in MyApp"
          onError={(error, errorInfo) => {
            // Auto-send to monitoring service
            Sentry.captureException(error, { extra: errorInfo })
          }}
        >
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  )
}
```

**Variants:**

| Variant | Description | Use Case |
|---------|-------------|----------|
| `default` | Inline card with icon and details | Component-level errors |
| `minimal` | Icon + text + button only | Small widgets, sidebars |
| `full` | Full-page centered card | Root layouts, critical errors |

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | Components to wrap (required) |
| `fallback` | `ReactNode \| Function` | - | Custom fallback UI |
| `title` | `string` | "Something went wrong" | Error title |
| `description` | `string` | "We encountered..." | Error description |
| `showResetButton` | `boolean` | `true` | Show "Try Again" button |
| `showDetails` | `boolean` | `dev only` | Show technical error details |
| `onError` | `Function` | - | Callback for logging (Sentry) |
| `onReset` | `Function` | - | Callback after retry |
| `className` | `string` | - | Custom container className |
| `variant` | `'default' \| 'minimal' \| 'full'` | `'default'` | Visual variant |
| `maxRetries` | `number` | `3` | Max retry attempts |

**Features:**

- **Auto-detection:** Shows stack trace in dev, user-friendly messages in prod
- **Retry mechanism:** "Try Again" button with attempt counter (1/3, 2/3, 3/3)
- **Max retries:** After 3 attempts, shows permanent error with "Reload Page" option
- **Accessibility:** Full ARIA support (`role="alert"`, `aria-live="assertive"`)
- **Sentry integration:** Via `onError` callback for automatic error reporting
- **Customizable:** Custom titles, descriptions, and complete fallback UI

**Best Practices:**

- Use `variant="full"` in root layouts for app-level errors
- Use `variant="default"` for component-level errors
- Use `variant="minimal"` for small UI components (widgets, cards)
- Always provide `onError` callback for production error tracking
- Set custom `title` to identify which app/feature failed
- Keep `maxRetries={3}` to prevent infinite error loops

**Development vs Production:**

```tsx
// In development
- Shows full error stack trace
- Technical details visible by default
- Console logs errors

// In production
- User-friendly error messages
- Stack trace hidden (can toggle via showDetails)
- Only shows via onError callback
```

**Use Cases:**
- Root app layouts (catch all errors)
- Critical user flows (checkout, payment)
- Data-heavy components (dashboards, reports)
- Third-party integrations (maps, charts)
- Complex forms with validation

#### Dropdown

**100% Configurable menu with custom triggers**

```tsx
import { Dropdown, Button, Icon } from '@ezstart/ui/components'

// Basic dropdown
<Dropdown
  label="Actions"
  items={[
    { label: 'Edit', value: 'edit', onSelect: () => {} },
    { label: 'Delete', value: 'delete', onSelect: () => {} }
  ]}
/>

// Custom trigger
<Dropdown
  trigger={<Button variant="outline">Open Menu</Button>}
  items={items}
/>

// With icons and dividers
<Dropdown
  label="Options"
  items={[
    {
      label: 'Profile',
      value: 'profile',
      icon: <Icon name="lucide:User" size={16} />,
      onSelect: () => {}
    },
    {
      label: 'Settings',
      value: 'settings',
      icon: <Icon name="lucide:Settings" size={16} />,
      onSelect: () => {},
      divider: true
    },
    {
      label: 'Logout',
      value: 'logout',
      icon: <Icon name="lucide:LogOut" size={16} />,
      onSelect: () => {},
      disabled: false
    }
  ]}
/>

// Custom positioning
<Dropdown
  label="Menu"
  items={items}
  align="start"      // 'start' | 'center' | 'end'
  side="bottom"      // 'top' | 'bottom'
  fullWidth
/>
```

**Props:**
- `label` - Button label (if no custom trigger)
- `trigger` - Custom trigger element (replaces button)
- `items` - Menu items array
- `variant` - Button variant (when using label)
- `align` - Horizontal alignment: `start`, `center`, `end`
- `side` - Vertical position: `top`, `bottom`
- `fullWidth` - Menu width matches trigger
- `open` / `onOpenChange` - Controlled state

**Item Props:**
- `label` - Item text or ReactNode
- `value` - Unique identifier
- `onSelect` - Click callback
- `icon` - Icon element
- `disabled` - Disable item
- `divider` - Show divider after item

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

#### Modal (Recommended)

**100% Configurable & Accessible** - Built on Radix UI for WCAG 2.1 AA compliance.

```tsx
import { Modal } from '@ezstart/ui/components'

// Basic usage
<Modal isOpen={open} onClose={() => setOpen(false)}>
  <p>Modal content</p>
</Modal>

// With title, description, and footer
<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Create Invoice"
  description="Fill in the invoice details"
  footer={
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  }
>
  <InvoiceForm />
</Modal>

// Custom size
<Modal isOpen={open} onClose={() => setOpen(false)} size="xl">
  <LargeContent />
</Modal>

// Prevent closing on overlay click
<Modal
  isOpen={open}
  onClose={() => setOpen(false)}
  disableOverlayClick
  disableEscapeKey
>
  <ImportantForm />
</Modal>
```

**Props:**
- `isOpen: boolean` - Whether the modal is open
- `onClose?: () => void` - Callback when modal closes
- `title?: string | ReactNode` - Modal title (DialogHeader)
- `description?: string | ReactNode` - Description below title
- `footer?: ReactNode` - Action buttons
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Modal size preset (default: `'lg'`)
- `scrollBehavior?: 'inside' | 'outside'` - Where scrolling happens (default: `'inside'`)
- `noCross?: boolean` - Hide close button (default: `false`)
- `disableOverlayClick?: boolean` - Prevent closing on overlay click
- `disableEscapeKey?: boolean` - Prevent closing on Escape key
- `className?: string` - Additional CSS classes

**Accessibility Features:**
- ✅ Focus trap within modal
- ✅ Escape key to close (configurable)
- ✅ Click outside to close (configurable)
- ✅ Screen reader announcements
- ✅ Proper ARIA attributes
- ✅ Keyboard navigation support

#### Dialog (Low-level primitives)

For advanced use cases, use Dialog primitives directly:

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

**When to use Dialog vs Modal:**
- **Use Modal** ✅ - For 99% of use cases (recommended, simpler API)
- **Use Dialog** - When you need full control over Radix Dialog primitives

#### AlertDialog

**Enhanced with semantic variants** - Automatic styling for different alert types

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@ezstart/ui/components'

// Destructive alert (delete, remove)
<AlertDialog variant="destructive" open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Account?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. All your data will be permanently deleted.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Warning alert
<AlertDialog variant="warning">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
      <AlertDialogDescription>
        You have unsaved changes. Are you sure you want to leave?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Stay</AlertDialogCancel>
      <AlertDialogAction>Leave</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Info alert
<AlertDialog variant="info">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>New Feature Available</AlertDialogTitle>
      <AlertDialogDescription>
        Check out our new dashboard improvements!
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogAction>Got it</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**Props:**
- `variant` - Alert type: `default`, `destructive`, `warning`, `info`
- Action button automatically styled based on variant (red for destructive, default for others)

**Use Cases:**
- Destructive actions (delete, remove, irreversible)
- Warnings (unsaved changes, data loss)
- Info (announcements, confirmations)

### Form Components Enhancements

#### Checkbox

**Enhanced with indeterminate state** - Perfect for "select all" functionality

```tsx
import { Checkbox } from '@ezstart/ui/components'

// Basic checkbox
<Checkbox checked={checked} onCheckedChange={setChecked} />

// With built-in label
<Checkbox
  id="terms"
  label="I accept the terms and conditions"
  checked={accepted}
  onCheckedChange={setAccepted}
/>

// Indeterminate state (partial selection)
<Checkbox
  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
  onCheckedChange={handleSelectAll}
  label="Select all items"
/>
```

**Features:**
- ✅ `checked="indeterminate"` - Shows minus icon for partial selection
- ✅ `label` prop - Built-in label with proper htmlFor binding
- ✅ Accessible (ARIA, keyboard nav)

**Use Cases:**
- Select all with partial selection
- Terms and conditions
- Multi-step form checkboxes

#### Tooltip

**Enhanced with variants & positioning** - Semantic colors for different tooltip types

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@ezstart/ui/components'

// Basic tooltip
<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Helpful information</TooltipContent>
</Tooltip>

// Positioned tooltip
<Tooltip>
  <TooltipTrigger>Info</TooltipTrigger>
  <TooltipContent side="top" align="center">
    Top center tooltip
  </TooltipContent>
</Tooltip>

// Variant styles
<Tooltip>
  <TooltipTrigger>
    <Icon name="lucide:Info" />
  </TooltipTrigger>
  <TooltipContent variant="info">
    This is informational
  </TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger>
    <Icon name="lucide:AlertTriangle" />
  </TooltipTrigger>
  <TooltipContent variant="warning">
    Warning message
  </TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger>Success</TooltipTrigger>
  <TooltipContent variant="success" hideArrow>
    Operation completed
  </TooltipContent>
</Tooltip>
```

**Props:**
- `variant` - Visual style: `default`, `info`, `success`, `warning`, `destructive`
- `side` - Position: `top`, `right`, `bottom`, `left`
- `align` - Alignment: `start`, `center`, `end`
- `sideOffset` - Distance from trigger (default: 4px)
- `hideArrow` - Hide the arrow pointer

**Use Cases:**
- Help text on hover
- Icon explanations
- Status indicators
- Contextual information

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

**⚡ Performance Optimized** - Global cache prevents icon re-imports for instant loading

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

**Features:**
- ⚡ **Global Cache** - Icons loaded once, cached forever during the session
- 🔄 **Smart Loading** - Prevents duplicate imports with promise deduplication
- 🎨 **Multiple Libraries** - Support for Lucide, FontAwesome, and custom icons
- 📦 **Tree Shaking** - Only loads icons you actually use
- 💾 **Zero Re-renders** - Cached icons load instantly when switching tabs/routes

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
- ✅ **ezbill/web** - Billing management interface
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

### 2. Component Composition & Layered Architecture

The component library follows a **3-layer architecture** for maximum flexibility and code reuse:

```
Layer 3: Business Components (Composition with Logic)
├─ PasswordInput (Input + strength validation)
├─ BackButton (Button + navigation logic)
├─ Burger (Button + animation)
└─ LocaleSwitcher (Dropdown + i18n)
         ↓ compose
Layer 2: High-Level Components (Opiniated APIs)
├─ Modal (Dialog wrapper with defaults)
├─ Dropdown (Select wrapper simplified)
└─ Hero (Section + media logic)
         ↓ use
Layer 1: Primitives & Base Components (Unopinionated)
├─ Dialog (Radix wrapper)
├─ Select (Radix wrapper)
├─ Button, Input, Card, Badge...
```

**Why this matters:**
- **Layer 1 (Primitives):** Use for complex custom layouts
- **Layer 2 (High-Level):** Use for standard use cases (90% of the time)
- **Layer 3 (Business):** Use for specific patterns (password, navigation, etc.)

**Examples:**

✅ **Layer 2: Simple modal (recommended)**
```tsx
<Modal isOpen={open} onClose={close} title="Delete Item">
  Are you sure?
</Modal>
```

✅ **Layer 1: Complex custom modal (advanced)**
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <CustomComplexLayout />
  </DialogContent>
</Dialog>
```

✅ **Layer 3: Business pattern**
```tsx
<PasswordInput showStrength showRequirements />
```

❌ **Don't use HTML elements directly**
```tsx
<div className="border rounded p-4">
  <h3>Title</h3>
  <p>Content</p>
</div>
```

**Why separate components instead of merging?**
- PasswordInput is NOT a variant of Input (different responsibility)
- Modal is NOT a replacement for Dialog (different abstraction levels)
- This follows industry standards (shadcn/ui, Radix UI, Material-UI)

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
cd ../../apps/ezbill/web
pnpm dev
```

## Related Packages

- [`@ezstart/next-theme`](../next-theme/README.md) - Theme management (dark/light mode) for web applications
- [`@ezstart/tailwind-config`](../tailwind-config/README.md) - Tailwind configuration optimized for these components
- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint rules for component development
- [`@ezstart/typescript-config`](../typescript-config/README.md) - TypeScript configuration