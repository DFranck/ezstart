export const CONTACT_EMAIL = 'aseradni@nexora-venture.com'

export function contactMailto(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
