/**
 * Merge two variant config objects by concatenating string values per key.
 *
 * Example:
 * base = { xs: 'px-2 py-2', sm: 'px-4 py-4' }
 * override = { xs: 'text-xs', sm: 'text-sm' }
 * =>
 * result = { xs: 'px-2 py-2 text-xs', sm: 'px-4 py-4 text-sm' }
 */
export function mergeVariantStrings<
  T extends Record<string, string>,
  U extends Record<string, string>,
>(base: T, override: U): Record<keyof T & string, string> {
  return Object.fromEntries(
    Object.keys(base).map((key) => [
      key,
      [base[key], override[key] ?? ''].filter(Boolean).join(' '),
    ])
  ) as Record<keyof T & string, string>;
}
