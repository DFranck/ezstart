export const TEST_PRODUCTS = {
  // One-time purchases
  purchases: [
    {
      productId: 'ezpay-test-item',
      productName: 'EZPay Test Item',
      amount: 999, // €9.99
      currency: 'eur',
      description: 'Test product for development',
    },
    {
      productId: 'ezpay-premium-pass',
      productName: 'EZPay Premium Pass',
      amount: 2499, // €24.99
      currency: 'eur',
      description: 'Premium access pass for testing',
    },
  ],
  // Subscriptions (need Stripe Price IDs - these are placeholders)
  subscriptions: [
    {
      planId: 'ezpay-sub-monthly',
      planName: 'EZPay Monthly Plan',
      amount: 499, // €4.99/month
      currency: 'eur',
      interval: 'month' as const,
      description: 'Monthly subscription test',
    },
    {
      planId: 'ezpay-sub-yearly',
      planName: 'EZPay Yearly Plan',
      amount: 4999, // €49.99/year
      currency: 'eur',
      interval: 'month' as const,
      intervalCount: 12,
      description: 'Yearly subscription test',
    },
  ],
  // Donation presets
  donations: {
    projectId: 'ezpay',
    projectName: 'EZPay Development',
    amounts: [5, 10, 25, 50],
    currency: 'eur',
  },
}
