# Accessibility Best Practices - @ezstart Monorepo

> Practical accessibility guidelines for developing WCAG 2.1 Level AA compliant applications in the @ezstart monorepo.

**Last Updated:** 2025-11-05
**Target:** WCAG 2.1 Level AA Compliance
**Current Score:** 92/100 ⭐⭐⭐⭐⭐ Excellent

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [Component Usage](#component-usage)
- [Keyboard Navigation](#keyboard-navigation)
- [Screen Reader Support](#screen-reader-support)
- [Color & Contrast](#color--contrast)
- [Forms & Validation](#forms--validation)
- [Images & Media](#images--media)
- [Testing Guidelines](#testing-guidelines)

---

## Quick Reference

### ✅ DO

```tsx
// ✅ Use semantic components from @ezstart/ui
import { Button, Card, Input, H1, Main } from '@ezstart/ui'

<Main id="main-content">
  <Card>
    <H1>Welcome</H1>
    <Button>Click me</Button>
  </Card>
</Main>

// ✅ Use semantic color classes
<Card className="bg-card text-foreground border">

// ✅ Add alt text to images
<img src="/logo.png" alt="Company logo" />

// ✅ Label form inputs
<Input id="email" aria-label="Email address" />

// ✅ Use skip links for keyboard navigation
<SkipLink href="#main-content">Skip to main content</SkipLink>
```

### ❌ DON'T

```tsx
// ❌ Never use raw HTML elements
<div className="button">Click me</div>  // Use <Button>
<input type="text" />                    // Use <Input>
<h1 className="text-2xl">Title</h1>     // Use <H1>

// ❌ Never hardcode colors
<div className="bg-gray-100 text-gray-900">  // Use bg-card text-foreground

// ❌ Don't skip alt text
<img src="/logo.png" />  // Add alt="" if decorative

// ❌ Don't create unlabeled inputs
<input type="text" placeholder="Email" />  // Add <label> or aria-label
```

---

## Component Usage

### Buttons

**Always use the Button component:**

```tsx
import { Button } from '@ezstart/ui'

// ✅ Standard button
<Button>Submit</Button>

// ✅ Button with icon (icon is aria-hidden)
<Button>
  <Icon name="check" aria-hidden="true" />
  Confirm
</Button>

// ✅ Icon-only button (MUST have aria-label)
<Button aria-label="Delete item">
  <Icon name="trash" />
</Button>

// ❌ NEVER raw HTML button
<button className="px-4 py-2">Submit</button>
```

**Built-in accessibility:**
- ✅ Focus-visible indicators (2px primary outline)
- ✅ Keyboard navigation (Enter/Space)
- ✅ ARIA roles automatically handled
- ✅ Disabled state properly announced

### Forms

**Always use Input/Label components:**

```tsx
import { Input, Label, Textarea } from '@ezstart/ui'

// ✅ Labeled input (preferred method)
<div>
  <Label htmlFor="email">Email Address</Label>
  <Input id="email" type="email" required />
</div>

// ✅ Input with aria-label (when visual label not needed)
<Input
  type="search"
  aria-label="Search products"
  placeholder="Search..."
/>

// ✅ Textarea with description
<div>
  <Label htmlFor="bio">Biography</Label>
  <Textarea
    id="bio"
    aria-describedby="bio-help"
  />
  <span id="bio-help" className="text-muted-foreground">
    Tell us about yourself
  </span>
</div>

// ✅ Error handling
<div>
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={hasError}
    aria-describedby={hasError ? "password-error" : undefined}
  />
  {hasError && (
    <span id="password-error" role="alert" className="text-destructive">
      Password must be at least 8 characters
    </span>
  )}
</div>
```

### Headings

**Use semantic heading components:**

```tsx
import { H1, H2, H3, H4, H5, H6 } from '@ezstart/ui'

// ✅ Proper heading hierarchy
<article>
  <H1>Article Title</H1>
  <H2>Section 1</H2>
  <p>Content...</p>
  <H3>Subsection 1.1</H3>
  <H2>Section 2</H2>
</article>

// ❌ NEVER skip heading levels
<H1>Title</H1>
<H3>Skipped H2</H3>  // BAD!

// ❌ NEVER use headings for styling only
<H2 className="text-sm">Small text</H2>  // Use <P> + className instead
```

### Navigation

**Use Nav and semantic structure:**

```tsx
import { Nav, Button } from '@ezstart/ui'

// ✅ Navigation with landmarks
<Nav aria-label="Main navigation">
  <ul role="list">
    <li>
      <a href="/" aria-current={isActive ? "page" : undefined}>
        Home
      </a>
    </li>
  </ul>
</Nav>

// ✅ Skip link (automatically included in BaseClientLayout)
<SkipLink href="#main-content">Skip to main content</SkipLink>

// ✅ Main content area
<Main id="main-content">
  {/* Your page content */}
</Main>
```

### Modals & Dialogs

**Use Modal/Dialog components (built on Radix UI):**

```tsx
import { Modal, ModalHeader, ModalContent } from '@ezstart/ui'

// ✅ Accessible modal (Radix handles focus trapping, ESC key, etc.)
<Modal open={isOpen} onOpenChange={setIsOpen}>
  <ModalHeader>
    <H2>Confirm Action</H2>
  </ModalHeader>
  <ModalContent>
    <p>Are you sure you want to delete this item?</p>
    <div>
      <Button onClick={handleDelete}>Confirm</Button>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
    </div>
  </ModalContent>
</Modal>
```

**Built-in features:**
- ✅ Focus trapping (can't Tab outside modal)
- ✅ ESC key closes modal
- ✅ Focus returns to trigger on close
- ✅ aria-modal="true" automatically applied

---

## Keyboard Navigation

### Required Patterns

**All interactive elements must support:**

1. **Tab/Shift+Tab** - Navigate between elements
2. **Enter/Space** - Activate buttons/links
3. **ESC** - Close modals/dropdowns
4. **Arrow keys** - Navigate lists/menus

### Testing Your Components

```tsx
// ✅ Test checklist for keyboard accessibility:
// 1. Can you reach all interactive elements with Tab?
// 2. Is focus visible (outline/ring)?
// 3. Can you activate with Enter/Space?
// 4. Does ESC close modal/dropdown?
// 5. No keyboard traps (can always Tab out)?
```

### Focus Management

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@ezstart/ui'

// ✅ Auto-focus first input in modal
function MyModal({ isOpen }: { isOpen: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <Modal open={isOpen}>
      <Input ref={inputRef} aria-label="Name" />
    </Modal>
  )
}
```

---

## Screen Reader Support

### ARIA Attributes

**Common patterns:**

```tsx
// ✅ Live regions (for dynamic content)
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ✅ Loading state
<Button disabled aria-busy={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// ✅ Expandable sections
<button
  aria-expanded={isExpanded}
  aria-controls="details-section"
  onClick={toggle}
>
  Show details
</button>
<div id="details-section" hidden={!isExpanded}>
  {/* Content */}
</div>

// ✅ Current page in navigation
<a
  href="/dashboard"
  aria-current={pathname === '/dashboard' ? 'page' : undefined}
>
  Dashboard
</a>
```

### ARIA Labels

```tsx
// ✅ Icon-only buttons MUST have aria-label
<Button aria-label="Close menu">
  <Icon name="x" />
</Button>

// ✅ Decorative images MUST have empty alt
<img src="/decoration.svg" alt="" aria-hidden="true" />

// ✅ Complex interactions
<div
  role="tablist"
  aria-label="Account settings tabs"
>
  <button role="tab" aria-selected={isSelected}>
    Profile
  </button>
</div>
```

### Screen Reader Testing Commands

**NVDA (Windows - FREE):**
```
Download: https://www.nvaccess.org/download/
- Insert + Down Arrow: Start reading
- Ctrl: Stop reading
- Tab: Next interactive element
- H: Next heading
```

**VoiceOver (macOS - Built-in):**
```
Enable: Cmd + F5
- VO + A: Start reading
- VO + Right Arrow: Next element
- VO + H: Next heading
- VO + U: Rotor (navigate by headings, links, etc.)
```

---

## Color & Contrast

### Semantic Color System

**ALWAYS use semantic classes:**

```tsx
// ✅ Semantic colors (auto dark mode support)
<Card className="bg-card text-foreground border">
  <H2 className="text-foreground">Title</H2>
  <P className="text-muted-foreground">Description</P>
  <Button className="bg-primary text-primary-foreground">
    Action
  </Button>
</Card>

// ❌ NEVER hardcode colors
<div className="bg-white text-black">  // Breaks dark mode
<div className="bg-red-500">           // Not semantic
```

### Available Semantic Classes

| Purpose | Background | Text | Border |
|---------|-----------|------|--------|
| Page background | `bg-background` | `text-foreground` | - |
| Card/Container | `bg-card` | `text-card-foreground` | `border` |
| Muted content | `bg-muted` | `text-muted-foreground` | `border-muted` |
| Primary actions | `bg-primary` | `text-primary-foreground` | - |
| Destructive | `bg-destructive` | `text-destructive-foreground` | - |
| Accents | `bg-accent` | `text-accent-foreground` | - |

### Contrast Requirements

**WCAG 2.1 Level AA:**
- **Normal text:** 4.5:1 minimum
- **Large text (18pt+):** 3:1 minimum
- **UI components:** 3:1 minimum

**Built-in compliance:**
- ✅ Tailwind semantic colors meet WCAG AA
- ✅ Dark mode automatically maintains contrast
- ✅ Focus indicators are 2px primary (high contrast)

---

## Forms & Validation

### Error Handling

```tsx
'use client'

import { useState } from 'react'
import { Input, Label, Button } from '@ezstart/ui'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    // Submit...
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
          required
        />
        {error && (
          <span
            id="email-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {error}
          </span>
        )}
      </div>
      <Button type="submit">Sign in</Button>
    </form>
  )
}
```

**Key points:**
- ✅ `aria-invalid={Boolean(error)}` - Announces error state
- ✅ `aria-describedby` - Links error message to input
- ✅ `role="alert"` - Screen reader announces error immediately
- ✅ `required` - Browser validation

### Required Fields

```tsx
// ✅ Visual + ARIA indication
<Label htmlFor="name">
  Name <span aria-label="required">*</span>
</Label>
<Input id="name" required aria-required="true" />

// ✅ Alternative: text indication
<Label htmlFor="name">
  Name (required)
</Label>
<Input id="name" required />
```

---

## Images & Media

### Image Alt Text

```tsx
// ✅ Informative image
<img
  src="/product.jpg"
  alt="Blue cotton t-shirt with round neck"
/>

// ✅ Decorative image (MUST have empty alt)
<img
  src="/divider.svg"
  alt=""
  aria-hidden="true"
/>

// ✅ Logo with text
<img
  src="/logo.png"
  alt="Company Name"
/>

// ✅ Icon with adjacent text (decorative)
<Button>
  <Icon name="save" aria-hidden="true" />
  Save
</Button>

// ✅ Icon without text (needs label)
<Button aria-label="Save document">
  <Icon name="save" />
</Button>
```

### Complex Images

```tsx
// ✅ Chart/graph with description
<figure>
  <img
    src="/sales-chart.png"
    alt="Bar chart showing monthly sales"
    aria-describedby="chart-description"
  />
  <figcaption id="chart-description">
    Sales increased from $10K in January to $25K in June,
    with steady growth each month.
  </figcaption>
</figure>
```

### Videos

```tsx
// ✅ Video with controls and captions
<video controls>
  <source src="/demo.mp4" type="video/mp4" />
  <track
    kind="captions"
    src="/demo-captions.vtt"
    srcLang="en"
    label="English"
  />
  Your browser does not support the video tag.
</video>
```

---

## Testing Guidelines

### Manual Testing Checklist

**Keyboard Navigation:**
- [ ] Tab through all interactive elements
- [ ] Focus is visible on all elements
- [ ] Enter/Space activates buttons/links
- [ ] ESC closes modals/dropdowns
- [ ] No keyboard traps
- [ ] Skip link appears on Tab

**Screen Reader:**
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Errors are announced
- [ ] Headings are in logical order
- [ ] Dynamic content announces updates

**Color & Contrast:**
- [ ] All text is readable in light mode
- [ ] All text is readable in dark mode
- [ ] Focus indicators are visible
- [ ] Color is not the only indicator (icons/text too)

### Automated Testing

```bash
# axe-core CLI (install globally)
npm install -g @axe-core/cli

# Test a running app
npx @axe-core/cli http://localhost:5005

# Lighthouse accessibility audit
npx lighthouse http://localhost:5005 --only-categories=accessibility --view
```

### Browser Extensions

**Recommended:**
1. **axe DevTools** - https://www.deque.com/axe/browser-extensions/
2. **WAVE** - https://wave.webaim.org/extension/
3. **Lighthouse** - Built into Chrome DevTools

---

## Common Patterns

### Loading States

```tsx
// ✅ Accessible loading spinner
<div role="status" aria-live="polite" aria-label="Loading">
  <Spinner />
  <span className="sr-only">Loading...</span>
</div>

// ✅ Loading button
<Button disabled aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner className="mr-2" aria-hidden="true" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

### Toast Notifications

```tsx
// ✅ Accessible toast (auto-announced)
<div
  role="alert"
  aria-live="assertive"
  className="toast"
>
  <Icon name="check" aria-hidden="true" />
  <span>Changes saved successfully</span>
</div>

// ✅ Dismissible toast
<div role="alert" aria-live="assertive">
  <span>New message received</span>
  <Button
    variant="ghost"
    size="sm"
    aria-label="Dismiss notification"
    onClick={dismiss}
  >
    <Icon name="x" />
  </Button>
</div>
```

### Data Tables

```tsx
// ✅ Accessible table
<table>
  <caption>Monthly Sales Report</caption>
  <thead>
    <tr>
      <th scope="col">Month</th>
      <th scope="col">Sales</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">January</th>
      <td>$10,000</td>
    </tr>
  </tbody>
</table>

// ✅ For complex tables, consider responsive card layout on mobile
```

---

## Resources

### Official Guidelines
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Complete guidelines
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) - Practical guide
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Chrome DevTools
- [NVDA](https://www.nvaccess.org/) - Free screen reader (Windows)

### @ezstart Packages
- [@ezstart/ui](../../packages/ui/README.md) - Accessible component library
- [@ezstart/tailwind-config](../../packages/tailwind-config/README.md) - Semantic colors
- [ACCESSIBILITY-AUDIT.md](../audits/ACCESSIBILITY-AUDIT.md) - Current status

---

**Last Updated:** 2025-11-05
**Maintained by:** @ezstart team
**Questions?** Check CLAUDE.md or create an issue
