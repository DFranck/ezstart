#!/usr/bin/env node

// Test script pour reproduire le problème de pricing loss dans le quote flow

const BASE_URL = 'http://localhost:5020/api';
const USER_ID = '670fee3c5ed6d44c49e6e88c'; // User ID valide

async function callApi(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  console.log(`\n🔄 ${config.method} ${url}`);
  console.log('Headers:', config.headers);
  if (config.body) {
    console.log('Body:', config.body);
  }

  const response = await fetch(url, config);
  const responseText = await response.text();

  console.log(`📊 Status: ${response.status} ${response.statusText}`);

  try {
    const data = JSON.parse(responseText);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.log('Response (text):', responseText);
    return { ok: response.ok, data: responseText, status: response.status };
  }
}

async function testQuoteFlow() {
  console.log('🚀 Testing Quote Flow - Pricing Loss Issue');
  console.log('=' .repeat(50));

  try {
    // Step 1: Create a client first
    console.log('\n📋 Step 1: Create a test client');
    const clientResult = await callApi('/clients', {
      method: 'POST',
      body: {
        clientName: 'Test Client Corp',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@testclient.com',
        phone: '123-456-7890'
      }
    });

    if (!clientResult.ok) {
      console.error('❌ Failed to create client:', clientResult.data);
      return;
    }

    const clientId = clientResult.data._id;
    console.log(`✅ Client created with ID: ${clientId}`);

    // Step 2: Create a quote with pricing
    console.log('\n📋 Step 2: Create quote with items and pricing');
    const quoteResult = await callApi('/quotes', {
      method: 'POST',
      body: {
        clientId: clientId,
        items: [
          {
            label: 'Web Development',
            quantity: 10,
            price: 100  // 10 * 100 = 1000
          },
          {
            label: 'Design Services',
            quantity: 5,
            price: 80   // 5 * 80 = 400
          }
        ],
        taxRate: 20, // 20%
        currency: 'USD'
      }
    });

    if (!quoteResult.ok) {
      console.error('❌ Failed to create quote:', quoteResult.data);
      return;
    }

    const quote = quoteResult.data;
    const quoteId = quote._id;
    console.log(`✅ Quote created with ID: ${quoteId}`);
    console.log(`💰 Initial totals - Subtotal: ${quote.subtotal}, Tax: ${quote.taxAmount}, Total: ${quote.total}`);

    // Expected: subtotal: 1400, taxAmount: 280, total: 1680

    // Step 3: Change quote status to 'sent' (this is where pricing gets lost)
    console.log('\n📋 Step 3: Change quote status to "sent" (this should preserve pricing)');
    const sendResult = await callApi(`/quotes/${quoteId}`, {
      method: 'PUT',
      body: {
        status: 'sent'
      }
    });

    if (!sendResult.ok) {
      console.error('❌ Failed to send quote:', sendResult.data);
      return;
    }

    const sentQuote = sendResult.data;
    console.log(`✅ Quote status changed to: ${sentQuote.status}`);
    console.log(`💰 After status change - Subtotal: ${sentQuote.subtotal}, Tax: ${sentQuote.taxAmount}, Total: ${sentQuote.total}`);

    // Check if pricing is preserved
    if (sentQuote.subtotal !== quote.subtotal || sentQuote.total !== quote.total) {
      console.error('❌ PRICING LOST! Values should be preserved during status change');
      console.error(`Expected: subtotal=${quote.subtotal}, total=${quote.total}`);
      console.error(`Got: subtotal=${sentQuote.subtotal}, total=${sentQuote.total}`);
    } else {
      console.log('✅ Pricing preserved correctly!');
    }

    // Step 4: Accept the quote
    console.log('\n📋 Step 4: Accept the quote');
    const acceptResult = await callApi(`/quotes/${quoteId}`, {
      method: 'PUT',
      body: {
        status: 'accepted'
      }
    });

    if (!acceptResult.ok) {
      console.error('❌ Failed to accept quote:', acceptResult.data);
      return;
    }

    const acceptedQuote = acceptResult.data;
    console.log(`✅ Quote status changed to: ${acceptedQuote.status}`);
    console.log(`💰 After accept - Subtotal: ${acceptedQuote.subtotal}, Tax: ${acceptedQuote.taxAmount}, Total: ${acceptedQuote.total}`);

    // Final check
    if (acceptedQuote.subtotal !== quote.subtotal || acceptedQuote.total !== quote.total) {
      console.error('❌ PRICING LOST during accept! Values should be preserved');
    } else {
      console.log('✅ Pricing preserved through entire flow!');
    }

    console.log('\n🎉 Quote flow test completed');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

// Run the test
testQuoteFlow().catch(console.error);