import type { AuthModalShellProps } from '@ezstart/auth-sdk/components'

/**
 * Shared `modalShellProps` preset for auth Modals when they are rendered as
 * the page surface (the `(auth)/*` route group). The page layout already
 * paints the public chrome (header + footer) but we want the user to perceive
 * the modal as the primary surface — so:
 *
 * - `backdrop: 'opaque'` → solid background + blur hides the chrome behind
 * - `disableOverlayClick` → no accidental dismiss by clicking off the modal
 * - `disableEscapeKey` → Escape doesn't close (only the close X dismisses)
 *
 * Embedded usage of the same Modals (e.g. a "Sign in" button on any consumer
 * page that opens `<SignInModal isOpen={state} onClose={...} />`) does NOT
 * use this preset — defaults give semi-transparent backdrop + click-out
 * dismiss + Esc dismiss, which is what users expect when the modal is an
 * overlay over a page they were already on.
 */
export const MODAL_AS_PAGE: Partial<AuthModalShellProps> = {
  backdrop: 'opaque',
  disableOverlayClick: true,
  disableEscapeKey: true,
}
