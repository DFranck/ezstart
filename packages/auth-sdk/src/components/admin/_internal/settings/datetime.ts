/**
 * Datetime conversion helpers between ISO strings and the value format
 * expected by `<input type="datetime-local">`. Extracted from the
 * maintenance card for testability and to keep the section under the
 * 400-line policy ceiling.
 *
 * @internal
 */

/**
 * Convert an ISO datetime to the value format expected by
 * `<input type="datetime-local">`: `YYYY-MM-DDTHH:MM`.
 */
export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert a `datetime-local` input value to an ISO string (or null). */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}
