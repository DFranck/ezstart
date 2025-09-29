// Test rapide de la fonction calculateTotals
function calculateTotals(items, taxRate = 0) {
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

// Test avec les données du quote problématique
const testItems = [
  {
    label: "Backend",
    quantity: 35,
    price: 32
  }
];

console.log("Test calculateTotals:");
console.log("Items:", testItems);
console.log("Result:", calculateTotals(testItems, 0));
console.log("Expected: { subtotal: 1120, taxAmount: 0, total: 1120 }");