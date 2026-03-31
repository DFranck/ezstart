const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  VND: '₫',
  THB: '฿',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  CHF: 'CHF',
}

export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode
    return `${symbol}${amount.toFixed(2)}`
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode
}
