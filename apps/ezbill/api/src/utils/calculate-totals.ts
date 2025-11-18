import { BaseLineItem, BillingType } from '@ezbill/types';

/**
 * Calculate totals for itemized billing (line items)
 */
export function calculateTotals(items: BaseLineItem[], taxRate = 0) {
  // Validate inputs
  if (!Array.isArray(items)) {
    console.error('❌ calculateTotals: items is not an array');
    items = [];
  }

  if (typeof taxRate !== 'number' || isNaN(taxRate)) {
    console.error('❌ calculateTotals: invalid taxRate');
    taxRate = 0;
  }

  const subtotal = items.reduce((acc, item) => {
    // Validate item structure
    if (!item || typeof item !== 'object') {
      console.error('❌ calculateTotals: Invalid item');
      return acc;
    }

    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;

    if (isNaN(quantity) || isNaN(price)) {
      console.error(`❌ calculateTotals: Invalid quantity or price in item: ${item.label}`);
      return acc;
    }

    const itemTotal = quantity * price;

    if (isNaN(itemTotal)) {
      console.error('❌ calculateTotals: Item total is NaN');
      return acc;
    }

    return acc + itemTotal;
  }, 0);

  // Ensure subtotal is valid
  const validSubtotal = isNaN(subtotal) ? 0 : subtotal;
  const taxAmount = validSubtotal * (taxRate / 100);
  const total = validSubtotal + taxAmount;

  const result = {
    subtotal: Math.round(validSubtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  // Final validation
  if (isNaN(result.subtotal) || isNaN(result.taxAmount) || isNaN(result.total)) {
    console.error('❌ calculateTotals: Final result contains NaN');
    return { subtotal: 0, taxAmount: 0, total: 0 };
  }

  return result;
}

/**
 * Calculate totals for flat-rate billing
 */
export function calculateFlatRateTotals(flatRateAmount: number, taxRate = 0) {
  // Validate inputs
  const validAmount = typeof flatRateAmount === 'number' && !isNaN(flatRateAmount) ? flatRateAmount : 0;
  const validTaxRate = typeof taxRate === 'number' && !isNaN(taxRate) ? taxRate : 0;

  const subtotal = validAmount;
  const taxAmount = subtotal * (validTaxRate / 100);
  const total = subtotal + taxAmount;

  const result = {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  return result;
}

/**
 * Unified function that handles both billing types
 */
export function calculateBillingTotals(
  billingType: BillingType,
  taxRate = 0,
  options: {
    items?: BaseLineItem[];
    flatRateAmount?: number;
  }
) {
  if (billingType === 'flat-rate') {
    return calculateFlatRateTotals(options.flatRateAmount || 0, taxRate);
  } else {
    return calculateTotals(options.items || [], taxRate);
  }
}
