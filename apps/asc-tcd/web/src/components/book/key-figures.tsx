import { Div, P, Span } from '@ezstart/ui/components'

export interface KeyFiguresProps {
  /** One `value | label` pair per line. */
  source: string
}

/** Grid of headline numbers, parsed from a `figures` fenced block. */
export function KeyFigures({ source }: KeyFiguresProps) {
  const items = source
    .split('\n')
    .map(line => line.split('|').map(part => part.trim()))
    .filter(parts => parts.length === 2 && parts[0] !== '' && parts[1] !== '')

  return (
    <Div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      {items.map(([value, label]) => (
        <Div key={value} className="rounded-lg border border-border bg-card p-4 text-center">
          <Span className="block text-2xl font-bold text-primary sm:text-3xl">{value}</Span>
          <P className="mt-1 text-sm text-muted-foreground">{label}</P>
        </Div>
      ))}
    </Div>
  )
}
