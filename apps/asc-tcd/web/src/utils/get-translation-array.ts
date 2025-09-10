export function getTranslationArray<T = any>(
  source: any, // peut être une fonction de translation ou un objet
  key: string // la clé à chercher : "items", "tech", "roles", etc.
): T[] {
  let raw: unknown;

  // Si c'est une fonction next-intl (t)
  if (typeof source === 'function' && 'raw' in source) {
    raw = (source as any).raw(key);
  } else if (typeof source === 'object' && source !== null) {
    // Si c'est un objet (comme project)
    raw = source[key];
  }

  // On s'assure que c'est bien un tableau
  if (!Array.isArray(raw)) return [];
  return raw as T[];
}
