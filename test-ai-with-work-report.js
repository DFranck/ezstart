// Test AI extraction with the work report text
async function testWorkReport() {
  const workReportText = `## Semaine 8 : 9-15 Nov 2025 🇻🇳 (Vietnam) **9 NOV Lundi (0 commits backend + 1 commit frontend) - 3h** Frontend: • Add realtime OHLCV candles via SSE for curves • Fix SSE candle timing - wait for pool metadata before enabling • Fix SSE price double normalization in realtime candles • Remove debug logs from realtime OHLCV hook • Fix frontend realtime candle decimal normalization Backend: • Investigation: Test notification routes and OHLCV data structure for SSE **10 NOV Lundi (1 commit backend + 0 frontend) - 3h** Backend: • Fix trader activities marketcap to use pool token0 price Frontend: • Code review and testing realtime OHLCV integration **11 NOV Mardi (8 commits backend + 11 commits frontend) - 10h** Backend: • Add test route for OHLCV candles and cleanup • Fix OHLCV price normalization with token decimals • Add test route for curve trade events and OHLCV testing • Add Trending sort for pools • Add trending sort and improve test notifications Frontend: • Fix realtime curve OHLCV chart updates • Add detailed pool OHLCV merge logs • Fix: remove chart key to prevent full re-render • Implement Trending feature for pools • Add trending sort for launchpad with realtime SSE updates • Fix TypeScript: add trending to orderBy type • Add pool row highlight animation on swap events • Add reusable highlight animation system for pools and curves • Fix TypeScript: convert isHighlighted to boolean • Adjust highlight animation to 2s single pass • Support multiple simultaneous highlights with independent timers **12 NOV Mercredi (1 commit backend + 3 commits frontend) - 7h** Backend: • Add CORS for ui-v2-cleaning staging environment Frontend: • Add highlight animation to all responsive modes and improve sort animations • Fix pool highlight animation double trigger • Fix TypeScript errors in chat service and retry utility • Simplify documentation - reduce to essential content **13 NOV Jeudi (1 commit backend + 0 frontend) - 5h** Backend: • Fix activity marketcap using historical prices Frontend: • Testing activity tab with historical pricing • Investigation: Wallet balance vs backend balance discrepancies **14 NOV Vendredi (0 commits backend + 5 commits frontend) - 8h** Frontend: • Use wallet balance for active positions if available • Add trending and animations preferences to store • Merge ui-v2-integration into not commited ui-v2-cleaning • Connect pools and curves to preferences store • Change default pools sort to liquidity Backend: • Validation testing: Verify all sort endpoints (pools & curves) • API documentation: sortBy vs orderBy parameter inconsistency analysis`

  console.log('Testing AI extraction with work report text...\n')
  console.log('Input length:', workReportText.length, 'characters\n')

  try {
    const response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: workReportText })
    })

    const data = await response.json()

    console.log('Response:', JSON.stringify(data, null, 2))

    if (data.success) {
      console.log('\n✅ AI extracted data!')
    } else {
      console.log('\n❌ AI failed to extract data')
      console.log('\nThis is expected because the text is a work report, not an invoice request.')
      console.log('The AI is designed to extract invoice/quote data from natural language.')
      console.log('\nTry instead:')
      console.log('  "Invoice for John Doe, 40 hours development at 80€/hour"')
      console.log('  "Facture pour TechCorp, 5 jours de développement à 600€/jour"')
    }
  } catch (err) {
    console.error('❌ Request error:', err.message)
  }
}

testWorkReport()
