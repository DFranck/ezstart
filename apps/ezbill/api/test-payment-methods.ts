/**
 * Test script for payment methods soft delete
 * Run with: npx tsx test-payment-methods.ts
 */

const API_URL = 'http://localhost:6120/api'
const TEST_USER_ID = 'test-user-123' // You can replace with real userId

async function testPaymentMethods() {
  console.log('🧪 Testing Payment Methods Soft Delete\n')

  // 1. Create a test payment method
  console.log('1️⃣ Creating test payment method...')
  const createResponse = await fetch(`${API_URL}/payment-methods`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': TEST_USER_ID,
    },
    body: JSON.stringify({
      name: 'Test Payment Method',
      type: 'bank_transfer',
      accountNumber: '123456789',
      bankName: 'Test Bank',
      isDefault: false,
    }),
  })

  const created = await createResponse.json()
  console.log('✅ Created:', created)
  const paymentMethodId = created._id

  // 2. Get all payment methods (should include our new one)
  console.log('\n2️⃣ Getting all payment methods...')
  const getAllResponse = await fetch(`${API_URL}/payment-methods?userId=${TEST_USER_ID}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  })
  const allPaymentMethods = await getAllResponse.json()
  console.log('✅ Found:', allPaymentMethods.length, 'payment methods')

  // 3. Soft delete the payment method
  console.log('\n3️⃣ Soft deleting payment method...')
  const deleteResponse = await fetch(`${API_URL}/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': TEST_USER_ID },
  })
  const deleted = await deleteResponse.json()
  console.log('✅ Deleted:', deleted)
  console.log('   deletedAt:', deleted.deletedAt)

  // 4. Get active payment methods (should NOT include deleted one)
  console.log('\n4️⃣ Getting active payment methods...')
  const getActiveResponse = await fetch(`${API_URL}/payment-methods?userId=${TEST_USER_ID}`, {
    headers: { 'x-user-id': TEST_USER_ID },
  })
  const activePaymentMethods = await getActiveResponse.json()
  console.log('✅ Active payment methods:', activePaymentMethods.length)
  const foundActive = activePaymentMethods.find((pm: any) => pm._id === paymentMethodId)
  console.log(
    '   Our deleted PM in active list?',
    foundActive ? '❌ YES (BUG!)' : '✅ NO (correct)'
  )

  // 5. Get deleted payment methods ONLY
  console.log('\n5️⃣ Getting deleted payment methods only...')
  const getDeletedResponse = await fetch(
    `${API_URL}/payment-methods?userId=${TEST_USER_ID}&deletedOnly=true`,
    {
      headers: { 'x-user-id': TEST_USER_ID },
    }
  )
  const deletedPaymentMethods = await getDeletedResponse.json()
  console.log('✅ Deleted payment methods:', deletedPaymentMethods.length)
  const foundDeleted = deletedPaymentMethods.find((pm: any) => pm._id === paymentMethodId)
  console.log(
    '   Our deleted PM in deleted list?',
    foundDeleted ? '✅ YES (correct)' : '❌ NO (BUG!)'
  )

  if (foundDeleted) {
    console.log('   Data:', {
      name: foundDeleted.name,
      deletedAt: foundDeleted.deletedAt,
    })
  }

  // 6. Cleanup - hard delete
  console.log('\n6️⃣ Cleanup: Hard deleting test payment method...')
  await fetch(`${API_URL}/payment-methods/${paymentMethodId}?permanent=true`, {
    method: 'DELETE',
    headers: { 'x-user-id': TEST_USER_ID },
  })
  console.log('✅ Cleaned up\n')

  console.log('🎉 Test completed!')
}

testPaymentMethods().catch(console.error)
