# Design Token Specification

Source of truth for the token propagation system (`DesignTokenProvider` + `useDesignTokens`).

## Token Categories

### Structural (auto-propagate through tree)

| Token     | Purpose                                                    | Values                                        | Default   |
| --------- | ---------------------------------------------------------- | --------------------------------------------- | --------- |
| `size`    | Scale of elements (touch targets, padding, font size, gap) | xs, sm, default, lg, xl                       | `default` |
| `density` | Spacing between elements (gap, padding, line-height)       | compact, default, relaxed                     | `default` |
| `radius`  | Border roundness                                           | none, sm, default, md, lg, xl, 2xl, 3xl, full | `default` |

### Semantic (auto-propagate, sets the "mood")

| Token    | Purpose                                         | Values                                                                  | Default   |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| `intent` | Semantic color meaning (bg, border, text color) | default, primary, success, warning, destructive, danger, info, disabled | `default` |

### Visual (local only, do NOT auto-propagate)

| Token         | Purpose                           | Values                                                                              | Default   |
| ------------- | --------------------------------- | ----------------------------------------------------------------------------------- | --------- |
| `variant`     | Visual style of THIS component    | Per-component (Card: default/floating/ghost/..., Button: default/outline/ghost/...) | `default` |
| `colorScheme` | Color palette for themed sections | blue, green, purple, neutral, custom                                                | `neutral` |

## Propagation Rule

```
explicit prop > inherited from context > component default
```

A `<Card size="sm">` pushes `size="sm"` into context. A `<Button>` inside reads it. A `<Button size="lg">` ignores the inherited value.

## How Components Respond

Each component type responds to the same token differently:

### `size` token

| Component type                          | Response                                |
| --------------------------------------- | --------------------------------------- |
| **Container** (Card, Section, Div)      | padding, gap between children           |
| **Interactive** (Button, Input, Select) | touch target height, font size, padding |
| **Text** (H1-H6, P, Span)               | font size                               |
| **Feedback** (Badge, Spinner, Skeleton) | element dimensions, padding, font       |
| **Navigation** (Stepper, Tabs)          | step size, tab height                   |
| **Overlay** (Modal, Dialog)             | modal width                             |

### `density` token

| Component type              | Response                               |
| --------------------------- | -------------------------------------- |
| **Container** (Card, Table) | gap between children, internal padding |
| **Text**                    | line-height (tight/normal/relaxed)     |
| **Interactive**             | reduced/increased height               |
| **List/Table**              | row height, cell padding               |

### `intent` token

| Component type                    | Response                   |
| --------------------------------- | -------------------------- |
| **Container** (Tag, Div, Section) | background + border color  |
| **Text** (Tag text, P, Span)      | text color                 |
| **Interactive** (Button, Badge)   | background + text color    |
| **Feedback** (Alert, Badge)       | background + border + text |

### `radius` token

| Component type                  | Response       |
| ------------------------------- | -------------- |
| **Container** (Card, Dialog)    | border-radius  |
| **Interactive** (Button, Input) | border-radius  |
| **Feedback** (Badge)            | border-radius  |
| **Text**                        | not applicable |

## Token Sources (in tokens.ts)

Each token has pre-built CSS class maps in `tokens.ts`:

| Token     | Container map                                    | Text map               |
| --------- | ------------------------------------------------ | ---------------------- |
| `size`    | `sizeContainer`, `padding`, `gap`, `touchHeight` | `sizeText`, `fontSize` |
| `density` | `densityContainer`                               | `densityText`          |
| `intent`  | `intentContainer`                                | `intentText`           |
| `radius`  | `radius`                                         | n/a                    |

## Wiring Checklist

### Provider (container pushes tokens down)

```tsx
import { DesignTokenProvider } from '../../lib/design-system/DesignTokenContext'

function Card({ size, density, children }) {
  return (
    <DesignTokenProvider size={size ?? 'default'} density={density}>
      <div>{children}</div>
    </DesignTokenProvider>
  )
}
```

### Consumer (leaf inherits tokens)

```tsx
import { useDesignTokens } from '../../lib/design-system/DesignTokenContext'

function Button({ size: sizeProp }) {
  const inherited = useDesignTokens()
  const size = (sizeProp ?? inherited.size ?? 'default') as ButtonSize
  // use size...
}
```

## Currently Wired

### Providers (push tokens)

- Card (size, density)
- Table (size, density)
- FloatingPanel (size)

### Consumers (inherit tokens)

- **size**: Button, Badge, CardHeader, CardContent, CardFooter, SelectTrigger, Spinner, SkeletonAvatar, SkeletonCard, Stepper, Modal, SplitSection, SplitSectionItem, VersionSwitch, ThreadSidebarToggle
- **density**: CardHeader, CardContent, CardFooter
- **intent**: Tag

### Not yet wired

- **radius**: no components yet
- **intent**: only Tag (Badge, Button could benefit)
- **density**: only Card family (Table rows, Input height could benefit)
- **size**: Input, Textarea (need size prop added first)
