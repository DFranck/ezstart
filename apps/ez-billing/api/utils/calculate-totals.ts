import { BaseLineItem } from '@ezstart/types';

export function calculateTotals(items: BaseLineItem[], taxRate = 0) {
  const subtotal = items.reduce(
    (acc, item) => acc + item.quantity * item.price,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
