'use client'

import {
  Div,
  H3,
  H4,
  H6,
  Icon,
  iconSuggestions,
  Input,
  KnownIconName,
  Label,
  LI,
  P,
  UL,
} from '@ezstart/ui/components'
import { useMemo, useState } from 'react'
import { CopyCodeButton } from '../components/copy-code-button'
import { ResetButton } from '../components/reset-button'

type Props = {
  title: string
}

// Popular icons to showcase
const POPULAR_ICONS: KnownIconName[] = [
  'lucide:Heart',
  'lucide:Star',
  'lucide:Home',
  'lucide:User',
  'lucide:Settings',
  'lucide:Search',
  'lucide:Bell',
  'lucide:Mail',
  'lucide:Calendar',
  'lucide:Clock',
  'lucide:Check',
  'lucide:X',
  'lucide:ArrowRight',
  'lucide:ArrowLeft',
  'lucide:Download',
  'lucide:Upload',
]

const DEFAULT_SIZE = 32
const DEFAULT_COLOR = '#6366f1' // Indigo color visible on both themes
const DEFAULT_STROKE_WIDTH = 2
const DEFAULT_OPACITY = 100

const IconPlayground = ({ title }: Props) => {
  const [playgroundValue, setPlaygroundValue] = useState<KnownIconName | ''>('')
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [size, setSize] = useState(DEFAULT_SIZE)
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH)
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY)

  // 🔍 Filtrage dynamique
  const filteredSuggestions = useMemo(() => {
    if (!query) return []
    return iconSuggestions
      .filter(name => name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 15) // limite à 15
  }, [query])

  const handleSelect = (suggestion: string) => {
    setPlaygroundValue(suggestion as KnownIconName)
    setQuery(suggestion)
    setIsFocused(false) // masque la liste après sélection
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      // si Enter → prend la première suggestion
      const firstSuggestion = filteredSuggestions[0]
      if (firstSuggestion) {
        handleSelect(firstSuggestion)
      }
    }
  }

  const handleReset = () => {
    setPlaygroundValue('')
    setQuery('')
    setSize(DEFAULT_SIZE)
    setColor(DEFAULT_COLOR)
    setStrokeWidth(DEFAULT_STROKE_WIDTH)
    setOpacity(DEFAULT_OPACITY)
  }

  // Build code string
  const iconName = playgroundValue || 'lucide:HelpCircle'
  let code = `<Icon name="${iconName}"`
  if (size !== DEFAULT_SIZE) code += ` size={${size}}`
  if (color !== DEFAULT_COLOR) code += ` className="text-[${color}]"`
  if (strokeWidth !== DEFAULT_STROKE_WIDTH) code += ` style={{ strokeWidth: ${strokeWidth} }}`
  if (opacity !== DEFAULT_OPACITY) code += ` style={{ opacity: ${opacity / 100} }}`
  code += ' />'

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <H3>{title}</H3>
        <ResetButton onReset={handleReset} />
      </div>

      {/* Main Layout: 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Preview & Search */}
        <div className="space-y-4 order-2 lg:order-1">
          {/* Preview Card */}
          <div className="relative bg-gradient-to-br from-card via-card to-muted/20 rounded-xl border border-border shadow-lg overflow-hidden min-h-[400px] flex flex-col">
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="relative">
                {/* Decorative background */}
                <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary animate-pulse" />
                </div>

                <Icon
                  name={iconName}
                  size={size}
                  style={{
                    color,
                    strokeWidth,
                    opacity: opacity / 100,
                  }}
                  className="drop-shadow-2xl transition-all duration-300"
                />
              </div>
            </div>

            {/* Search Input Overlay */}
            <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
              <div className="relative flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                <Icon name="lucide:Search" size={16} className="text-muted-foreground" />
                <Input
                  value={query}
                  placeholder="Search icons... (e.g., lucide:Heart)"
                  onChange={e => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                  onKeyDown={handleKeyDown}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label="Search for an icon"
                />

                {isFocused && filteredSuggestions.length > 0 && (
                  <ul
                    className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-2xl max-h-[300px] overflow-y-auto z-50"
                    role="listbox"
                  >
                    {filteredSuggestions.map(s => (
                      <li
                        key={s}
                        onClick={() => handleSelect(s)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-all border-b border-border/50 last:border-0"
                        role="option"
                      >
                        <Icon name={s} size={20} />
                        <span className="text-sm font-mono">{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Code Preview */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <H6 className="text-sm font-semibold">Generated Code</H6>
              <CopyCodeButton code={code} />
            </div>
            <pre className="bg-muted/50 text-foreground rounded-lg p-4 text-sm overflow-x-auto font-mono border border-border/50">
              <code>{code}</code>
            </pre>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="space-y-4 order-1 lg:order-2">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Customize
            </h4>

            {/* Size Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Size</Label>
                <span className="text-sm font-mono text-muted-foreground">{size}px</span>
              </div>
              <input
                type="range"
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                min={16}
                max={128}
                step={4}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>16px</span>
                <span>128px</span>
              </div>
            </div>

            {/* Stroke Width */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Stroke Width</Label>
                <span className="text-sm font-mono text-muted-foreground">{strokeWidth}px</span>
              </div>
              <input
                type="range"
                value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))}
                min={1}
                max={4}
                step={0.5}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1px</span>
                <span>4px</span>
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Opacity</Label>
                <span className="text-sm font-mono text-muted-foreground">{opacity}%</span>
              </div>
              <input
                type="range"
                value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                min={0}
                max={100}
                step={5}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Color */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Color</Label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-16 h-16 rounded-lg border-2 border-border cursor-pointer"
                />
                <Input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Icons */}
      <div className="space-y-4">
        <H4>Popular Icons</H4>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {POPULAR_ICONS.map(iconName => (
            <button
              key={iconName}
              onClick={() => {
                setPlaygroundValue(iconName)
                setQuery(iconName)
              }}
              className="group flex flex-col items-center justify-center p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all cursor-pointer aspect-square hover:shadow-md"
              aria-label={`Select ${iconName}`}
            >
              <Icon name={iconName} size={28} className="group-hover:scale-110 transition-transform" ariaHidden />
              <span className="text-xs mt-2 text-center text-muted-foreground group-hover:text-foreground truncate w-full transition-colors">
                {iconName.split(':')[1]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IconPlayground
