# 🎨 EZBill Color System

## Overview

EZBill uses a semantic color system designed to provide clear visual distinction between different entities and document statuses. All colors are defined in `packages/ui/src/styles/globals.css` and automatically adapt to light/dark modes.

---

## 🏢 Entity Colors

### Client Colors (Cyan-Blue)
**Purpose:** Represent individual or company clients
**Feel:** Friendly, professional, trustworthy

```tsx
// Usage
className="bg-ezbill-client text-ezbill-client-foreground"

// Light mode: oklch(0.7 0.15 210)  - Bright cyan-blue
// Dark mode:  oklch(0.55 0.14 210) - Deeper cyan-blue
```

**Use Cases:**
- Client cards background/icons
- Client-related badges
- Client statistics charts

---

### Company Colors (Purple)
**Purpose:** Represent business entities (your companies)
**Feel:** Corporate, premium, authoritative

```tsx
// Usage
className="bg-ezbill-company text-ezbill-company-foreground"

// Light mode: oklch(0.68 0.18 290)  - Rich purple
// Dark mode:  oklch(0.58 0.16 290) - Deeper purple
```

**Use Cases:**
- Company cards
- Company selector
- Corporate branding elements

---

### Payment Method Colors (Green-Emerald)
**Purpose:** Represent payment methods (bank, PayPal, etc.)
**Feel:** Money, financial, success

```tsx
// Usage
className="bg-ezbill-payment text-ezbill-payment-foreground"

// Light mode: oklch(0.75 0.16 150)  - Fresh green-emerald
// Dark mode:  oklch(0.6 0.15 150)  - Deeper emerald
```

**Use Cases:**
- Payment method cards
- Payment-related buttons
- Financial indicators

---

## 📄 Document Type Colors

### Invoice Colors (Blue-Indigo)
**Purpose:** Official billing documents
**Feel:** Professional, official, trustworthy

```tsx
// Usage
className="bg-ezbill-invoice text-ezbill-invoice-foreground"

// Gradient variant
className="bg-gradient-to-r from-ezbill-invoice to-ezbill-invoice/80"

// Light mode: oklch(0.65 0.17 240)
// Dark mode:  oklch(0.55 0.15 240)
```

**Use Cases:**
- Invoice cards
- Invoice section headers
- Invoice-related icons

---

### Quote Colors (Green)
**Purpose:** Proposals and estimates
**Feel:** Growth, opportunity, potential

```tsx
// Usage
className="bg-ezbill-quote text-ezbill-quote-foreground"

// Light mode: oklch(0.7 0.17 135)
// Dark mode:  oklch(0.58 0.15 135)
```

**Use Cases:**
- Quote cards
- Quote section headers
- Quote-related actions

---

### Receipt Colors (Purple-Pink)
**Purpose:** Payment confirmations
**Feel:** Complete, confirmed, final

```tsx
// Usage
className="bg-ezbill-receipt text-ezbill-receipt-foreground"

// Light mode: oklch(0.68 0.2 310)
// Dark mode:  oklch(0.56 0.17 310)
```

**Use Cases:**
- Receipt cards
- Receipt section headers
- Completion indicators

---

## 📊 Status State Colors

### Draft Status (Gray-Blue)
**Purpose:** Work in progress documents
**Feel:** Incomplete, editable, in-progress

```tsx
// Usage
className="bg-ezbill-draft text-ezbill-draft-foreground"

// Light mode: oklch(0.68 0.05 250)  - Subtle gray-blue
// Dark mode:  oklch(0.5 0.04 250)   - Muted blue-gray
```

**Badge Example:**
```tsx
<Badge className="bg-ezbill-draft/10 text-ezbill-draft border-ezbill-draft/30">
  Draft
</Badge>
```

---

### Sent Status (Blue)
**Purpose:** Documents sent to clients
**Feel:** In-transit, awaiting response

```tsx
// Usage
className="bg-ezbill-sent text-ezbill-sent-foreground"

// Light mode: oklch(0.7 0.18 240)
// Dark mode:  oklch(0.56 0.16 240)
```

---

### Paid Status (Green)
**Purpose:** Invoices that have been paid
**Feel:** Success, money received, complete

```tsx
// Usage
className="bg-ezbill-paid text-ezbill-paid-foreground"

// Light mode: oklch(0.75 0.17 145)
// Dark mode:  oklch(0.6 0.15 145)
```

---

### Accepted Status (Green)
**Purpose:** Quotes that have been accepted
**Feel:** Approved, moving forward, positive

```tsx
// Usage
className="bg-ezbill-accepted text-ezbill-accepted-foreground"

// Light mode: oklch(0.73 0.16 135)
// Dark mode:  oklch(0.58 0.14 135)
```

---

### Rejected Status (Red)
**Purpose:** Declined quotes or failed transactions
**Feel:** Negative, declined, stopped

```tsx
// Usage
className="bg-ezbill-rejected text-ezbill-rejected-foreground"

// Light mode: oklch(0.65 0.22 25)
// Dark mode:  oklch(0.52 0.19 25)
```

---

### Pending Status (Orange-Amber)
**Purpose:** Awaiting action or decision
**Feel:** Attention needed, in-review, waiting

```tsx
// Usage
className="bg-ezbill-pending text-ezbill-pending-foreground"

// Light mode: oklch(0.75 0.18 80)
// Dark mode:  oklch(0.6 0.16 80)
```

---

## 🎯 Usage Patterns

### Entity Cards

```tsx
// Client Card
<Card className="border-l-4 border-ezbill-client">
  <div className="bg-gradient-to-r from-ezbill-client to-ezbill-client/80 rounded-xl p-3">
    <Icon name="lucide:User" className="text-ezbill-client-foreground" />
  </div>
  <h3 className="text-foreground">Client Name</h3>
</Card>

// Company Card
<Card className="border-l-4 border-ezbill-company">
  <div className="bg-gradient-to-r from-ezbill-company to-ezbill-company/80 rounded-xl p-3">
    <Icon name="lucide:Building" className="text-ezbill-company-foreground" />
  </div>
</Card>
```

### Document Status Badges

```tsx
// Draft badge (muted appearance)
<Badge className="bg-ezbill-draft/10 text-ezbill-draft border border-ezbill-draft/30">
  Draft
</Badge>

// Sent badge (active appearance)
<Badge className="bg-ezbill-sent/10 text-ezbill-sent border border-ezbill-sent/30">
  Sent
</Badge>

// Paid badge (success appearance)
<Badge className="bg-ezbill-paid/10 text-ezbill-paid border border-ezbill-paid/30">
  Paid
</Badge>
```

### Section Headers

```tsx
// Invoice Section
<DashboardSection
  icon="lucide:FileEdit"
  iconGradient="bg-gradient-to-r from-ezbill-invoice to-ezbill-invoice/80"
  title="Invoices"
/>

// Quote Section
<DashboardSection
  icon="lucide:FileText"
  iconGradient="bg-gradient-to-r from-ezbill-quote to-ezbill-quote/80"
  title="Quotes"
/>

// Receipt Section
<DashboardSection
  icon="lucide:Receipt"
  iconGradient="bg-gradient-to-r from-ezbill-receipt to-ezbill-receipt/80"
  title="Receipts"
/>
```

### Action Buttons

```tsx
// Mark as Paid button
<Button className="bg-ezbill-paid hover:bg-ezbill-paid/90 text-ezbill-paid-foreground">
  <Icon name="lucide:CheckCircle" />
  Mark Paid
</Button>

// Send Invoice button
<Button className="bg-ezbill-sent hover:bg-ezbill-sent/90 text-ezbill-sent-foreground">
  <Icon name="lucide:Send" />
  Send
</Button>

// Convert to Invoice button
<Button className="bg-ezbill-invoice hover:bg-ezbill-invoice/90 text-ezbill-invoice-foreground">
  <Icon name="lucide:FileEdit" />
  Convert to Invoice
</Button>
```

---

## 📈 Color Hierarchy

### Entity Level (Who/What)
1. **Client** - Cyan-Blue (210°)
2. **Company** - Purple (290°)
3. **Payment** - Green-Emerald (150°)

### Document Level (Type)
1. **Invoice** - Blue-Indigo (240°)
2. **Quote** - Green (135°)
3. **Receipt** - Purple-Pink (310°)

### Status Level (State)
1. **Draft** - Gray-Blue (250°)
2. **Sent** - Blue (240°)
3. **Paid** - Green (145°)
4. **Accepted** - Green (135°)
5. **Rejected** - Red (25°)
6. **Pending** - Orange-Amber (80°)

---

## 🎨 Color Psychology

| Color | Hue | Psychology | Use Case |
|-------|-----|-----------|----------|
| **Cyan-Blue** | 210° | Trust, professionalism, calm | Clients, partners |
| **Purple** | 290° | Premium, corporate, authority | Companies, brands |
| **Green-Emerald** | 150° | Money, success, growth | Payments, revenue |
| **Blue-Indigo** | 240° | Official, trustworthy, stable | Invoices, contracts |
| **Green** | 135° | Opportunity, positive, fresh | Quotes, proposals |
| **Purple-Pink** | 310° | Confirmation, complete, special | Receipts, confirmations |
| **Red** | 25° | Urgent, declined, negative | Rejected, overdue |
| **Orange-Amber** | 80° | Attention, waiting, caution | Pending, in-review |

---

## 🌓 Dark Mode Considerations

All EZBill colors automatically adapt to dark mode with:
- **Reduced luminosity** (L value decreased by ~10-15%)
- **Maintained chroma** (C value slightly adjusted for visibility)
- **Same hue** (H value preserved for brand consistency)

### Example:
```css
/* Light Mode */
--ezbill-client: oklch(0.7 0.15 210);  /* Bright, high contrast */

/* Dark Mode */
--ezbill-client: oklch(0.55 0.14 210); /* Darker, suitable for dark bg */
```

---

## ✅ Accessibility

All color combinations meet **WCAG AA** standards:
- Foreground/background contrast ratio ≥ 4.5:1
- Status colors distinguishable for colorblind users
- Semantic meaning reinforced with icons/text

---

## 🔧 Extending the System

To add new colors:

1. **Add to `globals.css`:**
```css
:root {
  --ezbill-new-entity: oklch(L C H); /* Light mode */
  --ezbill-new-entity-foreground: oklch(L C H);
}

.dark {
  --ezbill-new-entity: oklch(L C H); /* Dark mode */
  --ezbill-new-entity-foreground: oklch(L C H);
}
```

2. **Add to `@theme inline`:**
```css
@theme inline {
  --color-ezbill-new-entity: var(--ezbill-new-entity);
  --color-ezbill-new-entity-foreground: var(--ezbill-new-entity-foreground);
}
```

3. **Use in components:**
```tsx
className="bg-ezbill-new-entity text-ezbill-new-entity-foreground"
```

---

## 📝 Best Practices

1. **Always use semantic colors** instead of hardcoded values
2. **Use foreground variants** for text on colored backgrounds
3. **Add opacity** for subtle backgrounds (`bg-ezbill-*/10`)
4. **Combine with borders** for definition (`border-ezbill-*/30`)
5. **Test in both light and dark** modes before committing

---

## 🎯 Migration Guide

### Before (Hardcoded)
```tsx
❌ className="bg-gradient-to-r from-cyan-500 to-blue-600"
❌ className="bg-blue-100 text-blue-800"
❌ className="border-green-200"
```

### After (Semantic)
```tsx
✅ className="bg-gradient-to-r from-ezbill-client to-ezbill-client/80"
✅ className="bg-ezbill-sent/10 text-ezbill-sent"
✅ className="border-ezbill-paid/30"
```

---

## 📚 Related Documentation

- [Tailwind CSS Custom Colors](https://tailwindcss.com/docs/customizing-colors)
- [OKLCH Color Space](https://oklch.com/)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [FengShui Colors](./FENGSHUI-COLORS.md) - Similar pattern for FengShui app

---

**Last Updated:** 2025-01-14
**Maintained by:** @ezstart/ui team
