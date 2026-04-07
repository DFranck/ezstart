/**
 * Console Payment Provider (dev/testing)
 * Logs payment operations instead of processing them.
 * Same pattern as email-service ConsoleProvider.
 */
import type {
  IPaymentProvider,
  CheckoutOptions,
  CheckoutResult,
  SubscriptionCheckoutOptions,
  PaymentVerification,
  RefundResult,
  CancelResult,
  WebhookEvent,
} from './types.js'

let sessionCounter = 0

export class ConsoleProvider implements IPaymentProvider {
  readonly name = 'console'

  async createCheckoutSession(options: CheckoutOptions): Promise<CheckoutResult> {
    const sessionId = `console_session_${++sessionCounter}`
    console.log('[ConsoleProvider] createCheckoutSession', {
      sessionId,
      amount: options.amount,
      currency: options.currency,
      description: options.description,
      successUrl: options.successUrl,
      ...(options.discount ? { discount: options.discount } : {}),
    })

    return { sessionId, url: options.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId) }
  }

  async createSubscriptionCheckout(options: SubscriptionCheckoutOptions): Promise<CheckoutResult> {
    const sessionId = `console_sub_${++sessionCounter}`
    console.log('[ConsoleProvider] createSubscriptionCheckout', {
      sessionId,
      amount: options.amount,
      currency: options.currency,
      interval: 'month',
      intervalCount: options.intervalCount ?? 1,
      description: options.description,
      ...(options.discount ? { discount: options.discount } : {}),
    })

    return { sessionId, url: options.successUrl.replace('{CHECKOUT_SESSION_ID}', sessionId) }
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerification> {
    console.log('[ConsoleProvider] verifyPayment', { sessionId })

    return { paid: true, status: 'paid', paymentMethod: 'console' }
  }

  async refundPayment(paymentIntentId: string): Promise<RefundResult> {
    console.log('[ConsoleProvider] refundPayment', { paymentIntentId })

    return { refundId: `console_refund_${++sessionCounter}`, status: 'succeeded' }
  }

  async cancelSubscription(subscriptionId: string): Promise<CancelResult> {
    console.log('[ConsoleProvider] cancelSubscription', { subscriptionId })

    return { cancelled: true, status: 'canceled' }
  }

  verifyWebhookSignature(_payload: string | Buffer, _signature: string): WebhookEvent {
    console.log('[ConsoleProvider] verifyWebhookSignature (auto-pass)')

    return {
      type: 'checkout.completed',
      raw: {},
      data: {
        sessionId: 'console_webhook_session',
        mode: 'payment' as const,
      },
    }
  }
}
