import { BaseLineItem, BillingType } from '@ezbill/types';

/**
 * Calculate totals for itemized billing (line items)
 */
export function calculateTotals(items: BaseLineItem[], taxRate = 0) {
  console.log('🔍 calculateTotals called with:');
  console.log('  items:', JSON.stringify(items, null, 2));
  console.log('  taxRate:', taxRate);

  // Validate inputs
  if (!Array.isArray(items)) {
    console.error('🔍 ERROR: items is not an array:', items);
    items = [];
  }

  if (typeof taxRate !== 'number' || isNaN(taxRate)) {
    console.error('🔍 ERROR: taxRate is not a valid number:', taxRate);
    taxRate = 0;
  }

  const subtotal = items.reduce(
    (acc, item) => {
      // Validate item structure
      if (!item || typeof item !== 'object') {
        console.error('🔍 ERROR: Invalid item:', item);
        return acc;
      }

      const quantity = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;

      if (isNaN(quantity) || isNaN(price)) {
        console.error(`🔍 ERROR: Invalid quantity or price: quantity=${item.quantity}, price=${item.price}`);
        return acc;
      }

      console.log(`🔍   Processing item: quantity=${quantity}, price=${price}, label=${item.label}`);
      const itemTotal = quantity * price;
      console.log(`🔍   Item total: ${itemTotal}`);

      if (isNaN(itemTotal)) {
        console.error('🔍 ERROR: Item total is NaN');
        return acc;
      }

      return acc + itemTotal;
    },
    0
  );
  console.log('🔍 Final subtotal:', subtotal);

  // Ensure subtotal is valid
  const validSubtotal = isNaN(subtotal) ? 0 : subtotal;
  const taxAmount = validSubtotal * (taxRate / 100);
  const total = validSubtotal + taxAmount;

  const result = {
    subtotal: Math.round(validSubtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };

  console.log('🔍 calculateTotals result:', result);

  // Final validation
  if (isNaN(result.subtotal) || isNaN(result.taxAmount) || isNaN(result.total)) {
    console.error('🔍 ERROR: Final result contains NaN values:', result);
    return { subtotal: 0, taxAmount: 0, total: 0 };
  }

  return result;
}

/**
 * Calculate totals for flat-rate billing
 */
export function calculateFlatRateTotals(flatRateAmount: number, taxRate = 0) {
  console.log('🔍 calculateFlatRateTotals called with:');
  console.log('  flatRateAmount:', flatRateAmount);
  console.log('  taxRate:', taxRate);

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

  console.log('🔍 calculateFlatRateTotals result:', result);

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
