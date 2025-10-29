# Layout Component

**Smart, accessible, framework-agnostic layout system with adaptive navigation.**

## Features

✅ **Smart Navigation** - Auto-adapts to device (desktop/tablet/mobile)
✅ **Full Accessibility** - ARIA landmarks, roles, keyboard navigation
✅ **Framework Agnostic** - Works with Next.js, React Router, or native `<a>`
✅ **Flexible Footer** - 3 layouts + 5 content zones
✅ **Performance Optimized** - React.memo, useCallback, conditional rendering
✅ **TypeScript** - Full type safety with type guards
✅ **Responsive** - 3 breakpoints with smart component switching

---

## Quick Start

```tsx
import { ClientLayout } from '@ezstart/ui/components/layout'
import Link from 'next/link'

<ClientLayout
  appName="MyApp"
  navLinks={[
    { href: '/', label: 'Home', icon: 'lucide:Home' },
    { href: '/about', label: 'About', icon: 'lucide:Info' },
    {
      menuLabel: 'Products',
      icon: 'lucide:Package',
      menu: [
        { href: '/products/new', label: 'New Arrivals' },
        { href: '/products/sale', label: 'On Sale' }
      ]
    }
  ]}
  LinkComponent={Link}
  currentPath="/home"
>
  {children}
</ClientLayout>
```

---

## Smart Navigation System

### One Prop, Three Behaviors

The `navLinks` prop automatically adapts navigation to the device:

| Device | Navigation Type | Location |
|--------|----------------|----------|
| **Desktop** (>1024px) | Inline links + Dropdown menus | Header center |
| **Tablet** (768-1024px) | Burger menu | Header right |
| **Mobile** (<768px) | Bottom navigation | Fixed bottom bar |

### Navigation Types

#### Simple Link

```tsx
{
  href: '/home',
  label: 'Home',
  icon: 'lucide:Home'  // Optional
}
```

#### Dropdown Menu

```tsx
{
  menuLabel: 'Products',
  icon: 'lucide:Package',  // Optional
  menu: [
    { href: '/products/new', label: 'New Arrivals', icon: 'lucide:Sparkles' },
    { href: '/products/sale', label: 'On Sale', icon: 'lucide:Tag' }
  ]
}
```

---

## Props API

### ClientLayout Props

#### App Info

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | `string` | **required** | Application name |
| `currentPath` | `string` | `'/'` | Current path for active states |

#### Smart Navigation

| Prop | Type | Description |
|------|------|-------------|
| `navLinks` | `NavigationLink[]` | Auto-adaptive navigation (recommended) |
| `bottomNavigation` | `NavigationItem[]` | Legacy: Mobile bottom nav items |
| `burgerNavigation` | `NavigationItem[]` | Legacy: Tablet burger menu items |
| `hideBottomNavOnMobile` | `boolean` | Hide bottom nav (e.g., for Stepper pages) |

#### Header

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showHeader` | `boolean` | `true` | Show/hide header |
| `headerPosition` | `'fixed' \| 'sticky' \| 'static'` | `'fixed'` | Header positioning |
| `headerLeftContent` | `ReactNode` | - | Custom left content |
| `headerCenterContent` | `ReactNode` | - | Custom center content (overrides navLinks) |
| `headerRightContent` | `ReactNode` | - | Custom right content |
| `headerClassName` | `string` | - | Header custom classes |

#### Footer

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showFooter` | `boolean` | `true` | Show/hide footer |
| `footerAppName` | `string` | Uses `appName` | Footer app name |
| `creator` | `ReactNode` | - | Creator info (string or JSX) |
| `footerShowCopyright` | `boolean` | `true` | Show copyright |
| `footerCopyrightYear` | `number` | Current year | Copyright year |
| `footerLayout` | `'simple' \| 'columns' \| 'stacked'` | `'simple'` | Footer layout |
| `footerStackOnMobile` | `boolean` | `true` | Stack vertically on mobile |

**Footer Content Zones:**
- `footerTopContent` - Above main content
- `footerLeftContent` - Left column
- `footerCenterContent` - Center column
- `footerRightContent` - Right column
- `footerBottomContent` - Below main content

#### Mobile Logo

| Prop | Type | Description |
|------|------|-------------|
| `mobileLogoIcon` | `KnownIconName` | Icon name (e.g., `'custom:MyLogo'`) |
| `mobileLogoSrc` | `string` | Image path (takes priority over icon) |
| `mobileLogoAlt` | `string` | Alt text for image |
| `mobileLogoHref` | `string` | Logo link (default: `'/'`) |

#### Components

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `LinkComponent` | `ComponentType \| 'a'` | `'a'` | Link component (Next Link, React Router, etc.) |

#### Styling

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Root container classes |
| `headerClassName` | `string` | Header classes |
| `footerClassName` | `string` | Footer classes |
| `mobileNavbarClassName` | `string` | Mobile navbar classes |

---

## Accessibility

### ARIA Landmarks

All navigation elements use proper ARIA landmarks:

```tsx
// Desktop
<nav role="navigation" aria-label="Primary navigation">
  {/* Navigation items */}
</nav>

// Footer
<footer role="contentinfo">
  {/* Footer content */}
</footer>
```

### Keyboard Navigation

**Desktop Dropdown Menus:**
- `Enter` / `Space` - Open/close menu
- `Escape` - Close menu
- `Tab` - Navigate between items

**Burger Menus (Tablet/Mobile):**
- `Enter` / `Space` - Toggle submenu
- `Escape` - Close submenu

### Active States

Current page is marked with `aria-current="page"`:

```tsx
<a
  href="/home"
  aria-current={isActive ? 'page' : undefined}
>
  Home
</a>
```

### Decorative Icons

Icons next to text labels are hidden from screen readers:

```tsx
<Icon name="lucide:Home" ariaHidden />
Home
```

---

## Examples

### Example 1: Simple Landing Page

```tsx
<ClientLayout
  appName="Acme Corp"
  navLinks={[
    { href: '/', label: 'Home' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact' }
  ]}
  LinkComponent={Link}
  creator={<a href="https://github.com/me">@me</a>}
>
  {children}
</ClientLayout>
```

### Example 2: App with Nested Menus

```tsx
<ClientLayout
  appName="Dashboard"
  currentPath={pathname}
  navLinks={[
    { href: '/dashboard', label: 'Dashboard', icon: 'lucide:LayoutDashboard' },
    {
      menuLabel: 'Products',
      icon: 'lucide:Package',
      menu: [
        { href: '/products/list', label: 'All Products', icon: 'lucide:List' },
        { href: '/products/new', label: 'Add Product', icon: 'lucide:Plus' },
        { href: '/products/categories', label: 'Categories', icon: 'lucide:Folder' }
      ]
    },
    {
      menuLabel: 'Orders',
      icon: 'lucide:ShoppingCart',
      menu: [
        { href: '/orders/pending', label: 'Pending' },
        { href: '/orders/completed', label: 'Completed' }
      ]
    },
    { href: '/settings', label: 'Settings', icon: 'lucide:Settings' }
  ]}
  LinkComponent={Link}
>
  {children}
</ClientLayout>
```

### Example 3: Mobile App with Bottom Nav

```tsx
<ClientLayout
  appName="SocialApp"
  navLinks={[
    { href: '/', label: 'Feed', icon: 'lucide:Home' },
    { href: '/explore', label: 'Explore', icon: 'lucide:Compass' },
    { href: '/notifications', label: 'Alerts', icon: 'lucide:Bell' },
    { href: '/profile', label: 'Profile', icon: 'lucide:User' }
  ]}
  LinkComponent={Link}
  currentPath={pathname}
  showFooter={false}  // Social apps usually don't have footer
>
  {children}
</ClientLayout>
```

### Example 4: Custom Footer Layout

```tsx
<ClientLayout
  appName="Enterprise"
  navLinks={[/* ... */]}
  footerLayout="columns"
  footerStackOnMobile={true}
  footerLeftContent={
    <div>
      <h3 className="font-bold mb-2">Company</h3>
      <ul className="space-y-1 text-sm">
        <li><a href="/about">About Us</a></li>
        <li><a href="/careers">Careers</a></li>
        <li><a href="/press">Press</a></li>
      </ul>
    </div>
  }
  footerCenterContent={
    <div>
      <h3 className="font-bold mb-2">Resources</h3>
      <ul className="space-y-1 text-sm">
        <li><a href="/docs">Documentation</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="/support">Support</a></li>
      </ul>
    </div>
  }
  footerRightContent={
    <div>
      <h3 className="font-bold mb-2">Legal</h3>
      <ul className="space-y-1 text-sm">
        <li><a href="/privacy">Privacy</a></li>
        <li><a href="/terms">Terms</a></li>
      </ul>
    </div>
  }
  footerBottomContent={
    <div className="flex gap-4 justify-center">
      <a href="https://twitter.com/acme">Twitter</a>
      <a href="https://github.com/acme">GitHub</a>
      <a href="https://linkedin.com/company/acme">LinkedIn</a>
    </div>
  }
>
  {children}
</ClientLayout>
```

### Example 5: Logo + Burger (No Bottom Nav)

```tsx
<ClientLayout
  appName="EZStart"
  navLinks={[
    { href: '/', label: 'Home', icon: 'lucide:Home' },
    { href: '/features', label: 'Features', icon: 'lucide:Sparkles' },
    { href: '/pricing', label: 'Pricing', icon: 'lucide:DollarSign' }
  ]}
  LinkComponent={Link}
  mobileLogoIcon="custom:EzStartLogo"
  mobileLogoHref="/"
  // No bottomNavigation = shows logo + burger on mobile
>
  {children}
</ClientLayout>
```

---

## Framework Integration

### Next.js (App Router)

```tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClientLayout } from '@ezstart/ui/components/layout'

export default function Layout({ children }) {
  const pathname = usePathname()

  return (
    <ClientLayout
      appName="MyApp"
      navLinks={[...]}
      LinkComponent={Link}
      currentPath={pathname}
    >
      {children}
    </ClientLayout>
  )
}
```

### React Router

```tsx
import { Link, useLocation } from 'react-router-dom'
import { ClientLayout } from '@ezstart/ui/components/layout'

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <ClientLayout
      appName="MyApp"
      navLinks={[...]}
      LinkComponent={Link}
      currentPath={location.pathname}
    >
      {children}
    </ClientLayout>
  )
}
```

### Native Links

```tsx
<ClientLayout
  appName="MyApp"
  navLinks={[...]}
  LinkComponent="a"  // Default
  currentPath={window.location.pathname}
>
  {children}
</ClientLayout>
```

---

## Footer Layouts

### Simple (Default)

Horizontal layout with left, center, right sections:

```tsx
<ClientLayout
  footerLayout="simple"
  footerLeftContent={<span>© 2024 Acme</span>}
  footerCenterContent={<span>Made with ❤️</span>}
  footerRightContent={<a href="/privacy">Privacy</a>}
/>
```

**Result:**
```
[© 2024 Acme]  [Made with ❤️]  [Privacy]
```

### Columns

Responsive grid (1-4 columns):

```tsx
<ClientLayout
  footerLayout="columns"
  footerLeftContent={<div>Company Links</div>}
  footerCenterContent={<div>Resources</div>}
  footerRightContent={<div>Legal</div>}
/>
```

**Result:**
```
Desktop:  [Company] [Resources] [Legal]
Tablet:   [Company] [Resources]
          [Legal]
Mobile:   [Company]
          [Resources]
          [Legal]
```

### Stacked

Vertical stack:

```tsx
<ClientLayout
  footerLayout="stacked"
  footerTopContent={<Logo />}
  footerLeftContent={<Navigation />}
  footerCenterContent={<Social />}
  footerRightContent={<Newsletter />}
  footerBottomContent={<Copyright />}
/>
```

**Result:**
```
[Logo]
[Navigation]
[Social]
[Newsletter]
[Copyright]
```

---

## Type System

### NavigationLink Union

```typescript
type NavigationLink = NavigationItem | NavigationMenu

interface NavigationItem {
  href: string
  label: string
  icon?: KnownIconName
}

interface NavigationMenu {
  menuLabel: string
  icon?: KnownIconName
  menu: NavigationItem[]
}
```

### Type Guards

```typescript
import { isNavigationMenu, isNavigationItem } from '@ezstart/ui/components/layout'

navLinks.forEach(link => {
  if (isNavigationMenu(link)) {
    // TypeScript knows: link.menuLabel, link.menu
    console.log(link.menuLabel)
  } else {
    // TypeScript knows: link.href, link.label
    console.log(link.href)
  }
})
```

---

## Performance

### React.memo

All components are memoized:
- `ClientLayout` (via internal components)
- `Footer` ✅
- `MobileNavbar` ✅
- `MobileNavMenu` ✅

### useCallback

Event handlers are memoized:

```typescript
const handleClose = useCallback(() => {
  setIsOpen(false)
}, [])

const toggleMenu = useCallback(() => {
  setIsOpen(prev => !prev)
}, [])
```

### Conditional Rendering

Components only render for their target device:

```typescript
if (!isMobile) return null  // MobileNavbar
if (!navLinks || !isDesktop) return null  // Desktop nav
```

---

## Best Practices

### ✅ DO

- Use `navLinks` for unified navigation across devices
- Set `currentPath` for active states
- Provide `LinkComponent` for your framework
- Use `ariaLabel` for icon-only buttons
- Hide decorative icons from screen readers

### ❌ DON'T

- Don't mix `navLinks` with legacy props (`bottomNavigation`, `burgerNavigation`)
- Don't forget to pass `currentPath` for active states
- Don't hardcode navigation in multiple places
- Don't skip keyboard event handlers
- Don't omit ARIA attributes

---

## Migration from Legacy Props

### Before (Legacy)

```tsx
<ClientLayout
  bottomNavigation={[
    { href: '/', icon: 'lucide:Home', label: 'Home' },
    { href: '/search', icon: 'lucide:Search', label: 'Search' }
  ]}
  burgerNavigation={[
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' }
  ]}
/>
```

### After (Smart Navigation)

```tsx
<ClientLayout
  navLinks={[
    { href: '/', label: 'Home', icon: 'lucide:Home' },
    { href: '/search', label: 'Search', icon: 'lucide:Search' },
    { href: '/about', label: 'About' }
  ]}
/>
```

**Benefits:**
- -50% props
- Automatic adaptation to all devices
- Consistent navigation across breakpoints

---

## Troubleshooting

### Navigation not showing on mobile

**Cause:** `navLinks` is empty or `hideBottomNavOnMobile` is `true`
**Solution:** Provide `navLinks` array with at least one item

### Dropdown menu not opening

**Cause:** Menu is hover-only on desktop (hover works, click doesn't)
**Solution:** Use keyboard (Enter/Space) or click again - click support added in v2

### Active state not working

**Cause:** `currentPath` prop not provided
**Solution:** Pass current pathname via `currentPath` prop

### Footer not showing

**Cause:** `showFooter={false}`
**Solution:** Set `showFooter={true}` or remove prop (default is `true`)

---

## Related Components

- **Header**: [packages/ui/src/components/header](../header)
- **Icon**: [packages/ui/src/components/icon](../icon)
- **Button**: [packages/ui/src/components/button](../button)
- **Burger**: [packages/ui/src/components/burger](../burger)

---

## License

MIT - Part of @ezstart/ui monorepo
