import { BaseLineItem } from '@ezbill/types';

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
