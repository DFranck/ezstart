// src/utils/capitalize.ts

/**
 * Capitalise la première lettre d'une chaîne de caractères.
 * @param text – La chaîne à capitaliser.
 * @returns La chaîne d'origine avec son premier caractère en majuscule.
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
