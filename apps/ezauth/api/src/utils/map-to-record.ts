/**
 * Convert a Map<string, string[]> to Record<string, string[]>
 * Handles both Map instances and plain objects (from Mongoose .lean())
 */
export function mapToRecord(
  map: Map<string, string[]> | Record<string, string[]> | undefined
): Record<string, string[]> {
  if (!map) return {}
  if (map instanceof Map) {
    return Object.fromEntries(map)
  }
  return map as Record<string, string[]>
}
