/**
 * Avatar URL validation.
 *
 * Accepted shapes:
 *   - `https://…` URL  (http is rejected — avatars are embedded in UIs)
 *   - `data:image/(png|jpeg|webp);base64,…`  (small inline avatars)
 *
 * Constraints:
 *   - Total string length ≤ MAX_AVATAR_URL_LENGTH (2048 chars)
 *   - For data URIs, decoded payload ≤ MAX_DATA_URI_BYTES (~100 KB)
 *
 * Rejecting anything else prevents SSRF-friendly schemes (file://, gopher://,
 * javascript:) and other unexpected content from landing in the DB and being
 * rendered unchecked by `<Image src={avatar} />` in consuming apps.
 */

export const MAX_AVATAR_URL_LENGTH = 2048
export const MAX_DATA_URI_BYTES = 100 * 1024 // 100 KB

const DATA_URI_RE = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/

export function isValidAvatarUrl(url: string): boolean {
  if (typeof url !== 'string') return false
  if (url.length === 0) return false
  if (url.length > MAX_AVATAR_URL_LENGTH) return false

  // Data URI branch
  if (url.startsWith('data:')) {
    const match = DATA_URI_RE.exec(url)
    if (!match) return false
    const b64 = match[2] ?? ''
    // 4 base64 chars = 3 bytes; approximate decoded size without allocating a Buffer.
    const approxBytes = Math.floor((b64.length * 3) / 4)
    return approxBytes <= MAX_DATA_URI_BYTES
  }

  // https:// branch
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}
