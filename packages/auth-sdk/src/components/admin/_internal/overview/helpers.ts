/**
 * Pure format/variant helpers for the overview section charts and stat cards.
 *
 * @internal
 */

/** Format short month/day label for the X axis (e.g. `Apr 12`). */
export function shortDateLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/** Compact percent display: 12.5 -> `12.5%`. */
export function pctLabel(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Trend variant for percent-style stats — green when positive, neutral otherwise. */
export function pctTrendVariant(value: number, threshold = 0): 'success' | 'default' {
  return value > threshold ? 'success' : 'default'
}
