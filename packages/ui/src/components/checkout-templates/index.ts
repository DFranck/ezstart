/**
 * Drop-in landing page templates for Stripe Checkout success / cancel
 * redirects. Pure presentation — read `?session_id=` from the URL via
 * `next/navigation` and render localised copy + CTAs. Originally part of
 * `@ezstart/pay-sdk` (PaymentSuccessPage / SubscribeSuccessPage / etc.) —
 * generalised to `@ezstart/ui` because the templates have zero payment
 * coupling (Stripe is just one possible source for the `session_id`).
 *
 * `_internal-callback-base` is intentionally NOT re-exported (private
 * implementation detail; consumer should compose via the named templates).
 */
export { PaymentSuccessTemplate, type PaymentSuccessTemplateProps } from './payment-success'
export {
  SubscribeSuccessTemplate,
  type SubscribeSuccessTemplateProps,
  type SubscribeSuccessTemplateTexts,
} from './subscribe-success'
export {
  SubscribeCancelTemplate,
  type SubscribeCancelTemplateProps,
  type SubscribeCancelTemplateTexts,
} from './subscribe-cancel'
export {
  DonateSuccessTemplate,
  type DonateSuccessTemplateProps,
  type DonateSuccessTemplateTexts,
} from './donate-success'
export {
  DonateCancelTemplate,
  type DonateCancelTemplateProps,
  type DonateCancelTemplateTexts,
} from './donate-cancel'
export {
  PurchaseSuccessTemplate,
  type PurchaseSuccessTemplateProps,
  type PurchaseSuccessTemplateTexts,
} from './purchase-success'
export {
  PurchaseCancelTemplate,
  type PurchaseCancelTemplateProps,
  type PurchaseCancelTemplateTexts,
} from './purchase-cancel'
