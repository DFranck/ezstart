# AnimatedCounter

Animated number counter that smoothly counts from a start value to an end value. Perfect for displaying statistics, metrics, or any numeric data with visual appeal.

## Features

- ✅ Smooth counting animation with easing
- ✅ Auto-triggers when visible (Intersection Observer)
- ✅ Customizable duration, decimals, separators
- ✅ Support for prefix/suffix (e.g., "$", "K", "+", "%")
- ✅ Multiple easing functions
- ✅ Accessible (uses `tabular-nums` for consistent width)
- ✅ TypeScript support
- ✅ Server-safe (no animation on first render)

## Basic Usage

```tsx
import { AnimatedCounter } from '@ezstart/ui/components'

// Simple counter (0 → 1000)
<AnimatedCounter value={1000} />

// Counter with custom start value (50 → 150)
<AnimatedCounter startValue={50} value={150} />

// No animation (instant display)
<AnimatedCounter value={100} animate={false} />
```

## With Prefix/Suffix

```tsx
// Money: $50,000
<AnimatedCounter
  value={50000}
  prefix="$"
  separator=","
/>

// Percentage: 95%
<AnimatedCounter
  value={95}
  suffix="%"
/>

// Growth: +250K
<AnimatedCounter
  value={250}
  prefix="+"
  suffix="K"
/>

// Euro: €1,234.56
<AnimatedCounter
  value={1234.56}
  prefix="€"
  separator=","
  decimals={2}
/>
```

## Duration & Easing

```tsx
// Fast animation (1 second)
<AnimatedCounter value={1000} duration={1000} />

// Slow animation (5 seconds)
<AnimatedCounter value={1000} duration={5000} />

// Linear easing (constant speed)
<AnimatedCounter value={1000} easing="linear" />

// Ease out (default - starts fast, ends slow)
<AnimatedCounter value={1000} easing="easeOutQuart" />

// Ease in-out (slow start & end, fast middle)
<AnimatedCounter value={1000} easing="easeInOutQuart" />
```

## Number Formatting

```tsx
// Thousands with comma separator: 1,234,567
<AnimatedCounter
  value={1234567}
  separator=","
/>

// Thousands with space separator: 1 234 567
<AnimatedCounter
  value={1234567}
  separator=" "
/>

// Decimals: 3.14159
<AnimatedCounter
  value={3.14159}
  decimals={5}
/>

// Money formatting: $1,234.56
<AnimatedCounter
  value={1234.56}
  prefix="$"
  separator=","
  decimals={2}
/>
```

## Stats Dashboard Example

```tsx
import { AnimatedCounter } from '@ezstart/ui/components'
import { Card, CardContent, CardHeader, H3 } from '@ezstart/ui/components'

function StatCard({ label, value, prefix, suffix }: {
  label: string
  value: number
  prefix?: string
  suffix?: string
}) {
  return (
    <Card>
      <CardHeader>
        <H3 size="h5" className="text-muted-foreground">{label}</H3>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            separator=","
            duration={2000}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// Usage
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <StatCard label="Total Revenue" value={125000} prefix="$" />
  <StatCard label="Active Users" value={1543} suffix="+" />
  <StatCard label="Growth Rate" value={23.5} suffix="%" decimals={1} />
</div>
```

## Landing Page Stats Example

```tsx
import { AnimatedCounter } from '@ezstart/ui/components'

function LandingStats() {
  const stats = [
    { label: 'Happy Customers', value: 10000, suffix: '+' },
    { label: 'Projects Completed', value: 5000, suffix: '+' },
    { label: 'Team Members', value: 150, suffix: '+' },
    { label: 'Countries Served', value: 50, suffix: '+' },
  ]

  return (
    <section className="py-20 bg-muted">
      <div className="container">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-5xl font-bold text-primary mb-2">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  separator=","
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | **required** | Target value to count to |
| `startValue` | `number` | `0` | Starting value |
| `duration` | `number` | `2000` | Animation duration in milliseconds |
| `animate` | `boolean` | `true` | Enable/disable animation |
| `decimals` | `number` | `0` | Number of decimal places |
| `separator` | `',' \| '.' \| ' ' \| ''` | `''` | Thousand separator character |
| `prefix` | `string` | `''` | Prefix to display before number (e.g., "$", "€") |
| `suffix` | `string` | `''` | Suffix to display after number (e.g., "+", "K", "%") |
| `easing` | `'linear' \| 'easeOutQuart' \| 'easeInOutQuart'` | `'easeOutQuart'` | Easing function for animation |
| `observeIntersection` | `boolean` | `true` | Trigger animation when element becomes visible |
| `className` | `string` | - | Additional CSS classes |

## Styling

The component uses `tabular-nums` by default for consistent width during animation. You can override with `className`:

```tsx
// Large bold primary color
<AnimatedCounter
  value={1000}
  className="text-6xl font-bold text-primary"
/>

// Custom colors
<AnimatedCounter
  value={100}
  className="text-green-600 font-semibold"
/>

// With gradient
<AnimatedCounter
  value={500}
  className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
/>
```

## Advanced: Restart Animation

```tsx
function RestartableCounter() {
  const [key, setKey] = React.useState(0)

  return (
    <div>
      <AnimatedCounter
        key={key} // Change key to restart animation
        value={1000}
      />
      <button onClick={() => setKey(k => k + 1)}>
        Restart Animation
      </button>
    </div>
  )
}
```

## Advanced: Update Value Dynamically

```tsx
function LiveCounter() {
  const [value, setValue] = React.useState(0)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue(v => v + Math.floor(Math.random() * 100))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <AnimatedCounter
      value={value}
      duration={500} // Short duration for frequent updates
    />
  )
}
```

## Accessibility

The component:
- Uses semantic HTML (`<span>`)
- Applies `tabular-nums` font feature for consistent width
- Works with screen readers (reads final value)
- No motion for users with `prefers-reduced-motion` (TODO: implement)

## Performance

- Uses `requestAnimationFrame` equivalent (16ms interval ≈ 60fps)
- Cleans up intervals on unmount
- Intersection Observer only observes when needed
- Minimal re-renders

## Browser Support

Works in all modern browsers that support:
- ES2020
- Intersection Observer API
- CSS `font-variant-numeric: tabular-nums`

## Related Components

- `Stats` - Pre-built stats section for landing pages
- `Badge` - For displaying static numbers/labels
- `Skeleton` - Loading state alternative
